// @flow

//Polyfills
import "unfetch/polyfill";
import "core-js/stable";
import "regenerator-runtime/runtime";

//Imports
import React, { Component, Fragment } from "react";
import ReactDOM from "react-dom";
import isEqual from "lodash.isequal";
import classnames from "classnames";

// $FlowFixMe
import "./Chatroom.scss";

import { uuidv4 } from "./utils";
import Message, { MessageTime } from "./Message";
import SpeechInput from "./SpeechInput";

const REDRAW_INTERVAL = 10000;
const GROUP_INTERVAL = 60000;

export type MessageType =
  | {
      type: "text",
      custom?: Object,
      text: string
    }
  | { type: "image", custom?: Object, image: string }
  | {
      type: "button",
      buttons: Array<{ payload: string, title: string, selected?: boolean, custom?: Object }>
    }
  | {
      type: "custom",
      content: any
    };

export type ChatMessage = {
  message: MessageType,
  username: string,
  time: number,
  uuid: string,
  voiceLang?: string
};

const WaitingBubble = () => (
  <li className="chat waiting">
    <span></span> <span></span> <span></span>
  </li>
);

const MessageGroup = ({ messages, onButtonClick, voiceLang, stickers }) => {
  const isBot = messages[0].username === "bot";
  const isButtonGroup =
    messages.length === 1 && messages[0].message.type === "button";
  return (
    <Fragment>
      {messages.map((message, i) => (
        <Message
          chat={message}
          key={i}
          onButtonClick={onButtonClick}
          voiceLang={voiceLang}
          stickers={stickers}
        />
      ))}
      {!isButtonGroup ? (
        <MessageTime time={messages[messages.length - 1].time} isBot={isBot} />
      ) : null}
    </Fragment>
  );
};

type ChatroomProps = {
  messages: Array<ChatMessage>,
  title: string,
  isOpen: boolean,
  definition: Object,
  waitingForBotResponse: boolean,
  speechRecognition: ?string,
  onButtonClick: (message: string, payload: string) => *,
  onSendMessage: (message: string) => *,
  onToggleChat: () => *,
  voiceLang: ?string,
  disableForm?: boolean,
  stickers?: Object
};

type ChatroomState = {
  inputValue: string
};

export default class Chatroom extends Component<ChatroomProps, ChatroomState> {
  state = {
    inputValue: "",
    showStickerControl: false
  };
  lastRendered: number = 0;
  chatsRef = React.createRef<HTMLDivElement>();
  inputRef = React.createRef<HTMLInputElement>();
  stickerSelectorRef = React.createRef<HTMLDivElement>();

  componentDidMount() {
    this.scrollToBot();
  }

  componentDidUpdate(prevProps: ChatroomProps) {
    if (!isEqual(prevProps.messages, this.props.messages)) {
      this.scrollToBot();
    }
    if (!prevProps.isOpen && this.props.isOpen) {
      this.focusInput();
    }
    this.lastRendered = Date.now();
  }

  shouldComponentUpdate(nextProps: ChatroomProps, nextState: ChatroomState) {
    return (
      !isEqual(nextProps, this.props) ||
      !isEqual(nextState, this.state) ||
      Date.now() > this.lastRendered + REDRAW_INTERVAL
    );
  }

  getInputRef(): HTMLInputElement {
    const { inputRef } = this;
    if (inputRef.current == null) throw new TypeError("inputRef is null.");
    return ((inputRef.current: any): HTMLInputElement);
  }

  getChatsRef(): HTMLElement {
    const { chatsRef } = this;
    if (chatsRef.current == null) throw new TypeError("chatsRef is null.");
    return ((chatsRef.current: any): HTMLElement);
  }

  getStickerSelectorRef(): HTMLElement {
    const { stickerSelectorRef } = this;
    if (stickerSelectorRef.current == null) throw new TypeError("stickerSelectorRef is null.");
    return ((stickerSelectorRef.current: any): HTMLElement);
  }

  scrollToBot() {
    this.getChatsRef().scrollTop = this.getChatsRef().scrollHeight;
  }

  focusInput() {
    this.getInputRef().focus();
  }

  handleSubmitMessage = async (e?: SyntheticEvent<>) => {
    if (e != null) {
      e.preventDefault();
    }
    const message = this.getInputRef().value.trim();
    this.props.onSendMessage(message);
    this.setState({ inputValue: "" });
    this.getInputRef().value = "";
  };

  handleButtonClick = (message: string, payload: string) => {
    if (this.props.onButtonClick != null) {
      this.props.onButtonClick(message, payload);
    }
    this.focusInput();
  };

  groupMessages(messages: Array<ChatMessage>) {
    if (messages.length === 0) return [];

    let currentGroup = [messages[0]];
    let lastTime = messages[0].time;
    let lastUsername = messages[0].username;
    let lastType = messages[0].message.type;
    const groups = [currentGroup];

    for (const message of messages.slice(1)) {
      if (
        // Buttons always have their own group
        lastType === "button" ||
        message.message.type === "button" ||
        // Messages are grouped by user/bot
        message.username !== lastUsername ||
        // Only time-continuous messages are grouped
        message.time > lastTime + GROUP_INTERVAL
      ) {
        // new group
        currentGroup = [message];
        groups.push(currentGroup);
      } else {
        // append to group
        currentGroup.push(message);
      }
      lastTime = message.time;
      lastUsername = message.username;
      lastType = message.message.type;
    }
    return groups;
  }

  handleInputChange = (inputValue: string, scrollToEnd: boolean = false) => {
    this.setState({ inputValue }, () => {
      if (scrollToEnd) {
        const inputRef = this.getInputRef();
        inputRef.focus();
        inputRef.scrollLeft = inputRef.scrollWidth;
      }
    });
  };

  toggleStickerSelector = () => {
    this.setState({ showStickerControl: !this.state.showStickerControl });
  };

  submitSticker = (e) => {
    this.toggleStickerSelector();
    this.handleButtonClick(e.target.dataset.content, e.target.dataset.content)
  }

  render() {
    const { messages, isOpen, waitingForBotResponse, voiceLang, disableForm, stickers } = this.props;
    const messageGroups = this.groupMessages(messages);
    const isClickable = i => !waitingForBotResponse && (i == messageGroups.length - 1); //TODO introduce disableForm into this
    let isButtonMsg, lastMessage = messages[messages.length-1];
    const hasStickers = ((stickers) && (Object.keys(stickers).length > 0));
    try   { isButtonMsg = ('locate' in lastMessage.message) || (lastMessage.message.buttons.length > 0) }
    catch { isButtonMsg = false; }

    return (
      <div className={classnames("project chatroom", isOpen ? "open" : "closed")}>
        <header className="">
          <h1 className="logo">{this.props.definition.title || "chatbot title"}</h1>
        </header>
        <div className="chats" ref={this.chatsRef}>
          {messageGroups.map((group, i) => (
            <MessageGroup
              messages={group}
              key={i}
              onButtonClick={ isClickable(i) ? this.handleButtonClick : undefined }
              voiceLang={voiceLang}
              stickers={stickers}
            />
          ))}
          {waitingForBotResponse ? <WaitingBubble /> : null}
        </div>

        <form autoComplete="off" className={ this.state.showStickerControl ? "input-controls show-stickers" : "input-controls" } disabled={disableForm} onSubmit={this.handleSubmitMessage}>
          {hasStickers === true ? (
            <div className="sticker-control" ref={this.stickerSelectorRef} >
              <ul>
              {Object.keys(stickers).map((s, i) => (
                <li onClick={this.submitSticker} key={i} data-content={":"+s+":"} style={{ backgroundImage: `url(${stickers[s].image})` }}></li>)
              )}
              </ul>
            </div>
          ) : null }

          <div className="main-inputs">
            {hasStickers === true ? (<button disabled={waitingForBotResponse || isButtonMsg || disableForm} type="button" className="toggle-sticker" onClick={this.toggleStickerSelector} style={{}}></button>) : null}
            <input
              disabled={waitingForBotResponse || isButtonMsg || disableForm}
              type="text"
              name="message"
              autoComplete="off"
              aria-label="Message text input"
              ref={this.inputRef}
            />
            <input type="submit" value="Send" disabled={waitingForBotResponse || isButtonMsg || disableForm} />
            {this.props.speechRecognition != null ? (
              <SpeechInput
                disableForm={disableForm}
                language={this.props.speechRecognition}
                onSpeechInput={message => this.handleInputChange(message, true)}
                onSpeechEnd={this.handleSubmitMessage}
              />
            ) : null}
          </div>
        </form>
      </div>
    );
  }
}
