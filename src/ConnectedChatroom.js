// @flow
import React, { Component } from "react";
import type { ElementRef } from "react";
import type { ChatMessage, MessageType } from "./Chatroom";
import Chatroom from "./Chatroom";
import Splash from "./Splash";
import { sleep, uuidv4, convertEmojisToShortcodes } from "./utils";
import { fetchTracker, extractMessages, appendEvents } from "./tracker.js";

type ConnectedChatroomProps = {
  userId: string,
  host: string,
  platformHost: string,
  definition: Object,
  deployment: Object,
  channel: string,
  welcomeMessage: ?string,
  startMessage: ?string,
  title: string,
  waitingTimeout: number,
  speechRecognition: ?string,
  messageBlacklist: Array<string>,
  handoffIntent: string,
  fetchOptions?: RequestOptions,
  voiceLang: ?string,
  rasaToken?: string,
  recoverHistory?: boolean,
  disableForm?: boolean
};

type ConnectedChatroomState = {
  messages: Array<ChatMessage>,
  messageQueue: Array<ChatMessage>,
  isOpen: boolean,
  waitingForBotResponse: boolean,
  currenthost: string,
  currenttitle: string,
  currentchannel: string,
  stickers: Object
};

type RasaMessage =
  | {| sender_id: string, text: string |}
  | {|
      sender_id: string,
      buttons: Array<{ title: string, payload: string, selected?: boolean }>,
      text?: string
    |}
  | {| sender_id: string, image: string, text?: string |}
  | {| sender_id: string, attachment: string, text ?: string |}
  | {| sender_id: string, custom: string, text?: string |};

export default class ConnectedChatroom extends Component<
  ConnectedChatroomProps,
  ConnectedChatroomState
> {
  state = {
    messages: [],
    messageQueue: [],
    stickers: {},
    isOpen: false,
    showSplash: true,
    showConsentForm: false,
    waitingForBotResponse: false,
    currenthost: `${this.props.host}`,
    currentchannel: `${this.props.channel}`,
    currenttitle: `${this.props.title}`
  };

  static defaultProps = {
    waitingTimeout: 9000,
    messageBlacklist: ["/inform", "/restart", "/start", "/affirm", "/deny", "/no_location_data", "/start_greet", "(...)", "/select_point"],
    handoffIntent: "handoff"
  };

  handoffpayload = `\\/(${this.props.handoffIntent})\\b.*`;
  handoffregex = new RegExp( this.handoffpayload );
  waitingForBotResponseTimer: ?TimeoutID = null;
  messageQueueInterval: ?IntervalID = null;
  chatroomRef = React.createRef<Chatroom>();
  welcomeMessageObj = {
    message: { type: "text", text: this.props.welcomeMessage },
    time: Date.now(),
    username: "bot",
    uuid: uuidv4()
  };

  addEvents = (events, cb) => {
    return appendEvents(events, this.props.fetchOptions, this.props.host, this.props.userId, this.props.rasaToken)
      .then(cb)
      .catch((e) => { console.error("Coudldn't append events: ", e); });
  }

  sendStartMessage = () => { //sends a message from client to server
    if (this.props.startMessage){
      this.sendMessage(this.props.startMessage);
    }
  }

  launchChat = () => {
    const messageDelay = 2900; //delay between message in ms
    this.messageQueueInterval = window.setInterval(this.queuedMessagesInterval, messageDelay);

    if (this.props.recoverHistory) {
      let messages = []; let noneRetrieved = false;
      this.setState({ waitingForBotResponse: true });

      fetchTracker(this.props.fetchOptions, this.props.host, this.props.userId, this.props.rasaToken).then(
        (tracker) => {
          messages = extractMessages(tracker);
          noneRetrieved = (messages.length === 0);
        }).catch((e) => {
          console.error("Coudldn't recover message history: ", e);
        })
        .then(() => {
          this.setState({ messages: messages, waitingForBotResponse: false });
          if (noneRetrieved) {
            //new session, confirm consent
            console.log("No consent form required/defined, hiding splash");// this.showConsentForm();
            this.sendStartMessage();
            this.hideSplash();
          } else {
            //restore from previous session
            this.hideSplash();
          }
        });
    } else {
      //confirm consent as we're not sure if new session or not
      this.showConsentForm();
      this.sendStartMessage();
    }
  }

  showConsentForm = () => {
    this.setState({ showConsentForm: true });
  }

  hideSplash = () => {
    this.setState({ showSplash: false });
  }

  completeConsent = () => {
    this.setState({ showConsentForm: false });
    this.hideSplash();
    this.sendStartMessage();
  }

  componentDidMount() {
    this.setState({ stickers: this.props.definition.stickers });
    setTimeout(this.launchChat, 1000);
  }

  componentWillUnmount() {
    if (this.waitingForBotResponseTimer != null) {
      window.clearTimeout(this.waitingForBotResponseTimer);
      this.waitingForBotResponseTimer = null;
    }
    if (this.messageQueueInterval != null) {
      window.clearInterval(this.messageQueueInterval);
      this.messageQueueInterval = null;
    }
  }

  sendFile = (files, successCb, errorCb) => {
    try {
      const deployment = this.props.deployment.deployment;
      const formData = new FormData();
      formData.append('deployment', deployment);
      for (const file of files) {console.log("f", file);  formData.append('files',file); }
      const attachmentUrl = `${this.props.platformHost}/api/v1/eventlogs/${this.props.userId}/attachments/`;
      fetch(attachmentUrl, { method: 'POST', body: formData })
      .then((response) => response.json())
      .then((result) => {
        let msg = '';
        for (const attachment of result.data){
          msg = msg += `![User picture upload](${attachment.url} "The user pic upload") `;
        }
        this.sendMessage("/send_pic", { displayText: msg });
        successCb(result);
      })
      .catch((error) => {
        console.error('Fetch error:', error);
        errorCb(error);
      })
    } catch(err) {
      console.log("Error", err);
      errorCb(err);
    }
  }

  sendMessage = async (payload: string, metadata: Object) => {
    if (payload === "") return;
    payload = convertEmojisToShortcodes(payload);

    let displayText = payload;
    if ((metadata) && ("displayText" in metadata) && (metadata["displayText"] !== "")) {
      displayText = metadata["displayText"];
    }

    const messageObj = {
      message: { type: "text", text: displayText },
      time: Date.now(),
      username: this.props.userId,
      uuid: uuidv4()
    };

    const startsWithBlacklisted = this.props.messageBlacklist.map(b => displayText.startsWith(b)).some((e) => e === true);
    if (!startsWithBlacklisted && !payload.match(this.handoffregex)) {
      this.setState({
        // Reveal all queued bot messages when the user sends a new message
        // otherwise, do not show the blacklist messages
        messages: [
          ...this.state.messages,
          ...this.state.messageQueue,
          messageObj
        ],
        messageQueue: []
      });
    }

    this.setState({ waitingForBotResponse: true });
    if (this.waitingForBotResponseTimer != null) {
      window.clearTimeout(this.waitingForBotResponseTimer);
    }
    this.waitingForBotResponseTimer = setTimeout(() => {
      this.setState({ waitingForBotResponse: false });
    }, this.props.waitingTimeout);

    const rasaMessageObj = {
      message: payload,
      sender: this.props.userId,
      metadata: metadata
    };

    const fetchOptions = Object.assign({}, {
      method: "POST",
      body: JSON.stringify(rasaMessageObj),
      headers: {
        "Content-Type": "application/json"
      }
    }, this.props.fetchOptions);

    const response = await fetch(
      `${this.state.currenthost}/webhooks/${this.state.currentchannel}/webhook`,
      fetchOptions
    );
    const messages = await response.json();

    this.parseMessages(messages);

    if (window.ga != null) {
      window.ga("send", "event", "chat", "chat-message-sent");
    }
  };

  createNewBotMessage(botMessageObj: MessageType): ChatMessage {
    return {
      message: botMessageObj,
      time: Date.now(),
      username: "bot",
      uuid: uuidv4()
    };
  }

  async parseMessages(RasaMessages: Array<RasaMessage>) {
    const validMessageTypes = ["text", "image", "buttons", "attachment", "custom"];

    let expandedMessages = [];

    RasaMessages.filter((message: RasaMessage) =>
      validMessageTypes.some(type => type in message)
    ).forEach((message: RasaMessage) => {
      let validMessage = false;

      if (message.text) {
        validMessage = true;
        expandedMessages.push(
          this.createNewBotMessage({ type: "text", text: message.text, custom: message.custom })
        );
      }

      if (message.buttons) {
        validMessage = true;
        expandedMessages.push(
          this.createNewBotMessage({ type: "button", buttons: message.buttons })
        );
      }

      if (message.image) {
        validMessage = true;
        expandedMessages.push(
          this.createNewBotMessage({ type: "image", image: message.image })
        );
      }

      if (message.attachment && message.attachment.type === "carousel") {
        validMessage = true;
        expandedMessages.push(
          this.createNewBotMessage({ type: "carousel", carousel: message.attachment.payload })
        );
      } else if (message.attachment) { // probably should be handled with special UI elements
        validMessage = true;
        expandedMessages.push(
          this.createNewBotMessage({ type: "text", text: message.attachment, custom: message.custom })
        );
      }

      if (message.custom && message.custom.soundcloud) {
        validMessage = true;
        expandedMessages.push(this.createNewBotMessage({
          type: "soundcloud", embed: message.custom.soundcloud, title: message.custom.title
        }));
      }

      if (message.custom && message.custom.locate) {
        validMessage = true;
        expandedMessages.push(this.createNewBotMessage({
          type: "locate", locate: message.custom.locate
        }));
      } else if (message.custom && message.custom.handoff_host) {
        validMessage = true;
        this.setState({
          currenthost: message.custom.handoff_host
        });
        if (message.custom.title) {
          this.setState({
            currenttitle: message.custom.title
          })
        }
        console.log(`switching to ${message.custom.handoff_host}`);
        this.sendMessage(`/${this.props.handoffIntent}{"from_host":"${this.props.host}"}`);
        return;
      }

      if (validMessage === false)
        throw Error("Could not parse message from Bot or empty message");
    });

    // Bot messages should be displayed in a queued manner. Not all at once
    const messageQueue = [...this.state.messageQueue, ...expandedMessages];
    this.setState({
      messageQueue,
      waitingForBotResponse: messageQueue.length > 0
    });
  }

  queuedMessagesInterval = () => {
    const { messages, messageQueue } = this.state;

    if (messageQueue.length > 0) {
      const message = messageQueue.shift();
      const waitingForBotResponse = messageQueue.length > 0;

      this.setState({
        messages: [...messages, message],
        messageQueue,
        waitingForBotResponse
      });
    }
  };

  handleButtonClick = (buttonTitle: string, payload: string) => {
    this.sendMessage(payload, { displayText: buttonTitle });
    if (window.ga != null) {
      window.ga("send", "event", "chat", "chat-button-click");
    }
  };

  handleToggleChat = () => {
    if (window.ga != null) {
      if (this.state.isOpen) {
        window.ga("send", "event", "chat", "chat-close");
      } else {
        window.ga("send", "event", "chat", "chat-open");
      }
    }
    this.setState({ isOpen: !this.state.isOpen });
  };

  render() {
    const { messages, waitingForBotResponse, showSplash } = this.state;

    const renderableMessages = messages
      .filter(
        (message) => {
          if (message.message.type !== "text") return true;
          const startsWithBlacklisted = this.props.messageBlacklist.map(b => message.message.text.startsWith(b)).some((e) => e === true);
          return (
            !startsWithBlacklisted &&
            !message.message.text.match(this.handoffregex)
          )
        }
      )
      .sort((a, b) => a.time - b.time);

    if (showSplash) {
      return (<Splash definition={this.props.definition} showConsentForm={this.state.showConsentForm} completeConsent={this.completeConsent} />)
    } else {
      return (
        <Chatroom
          definition={this.props.definition}
          messages={renderableMessages}
          title={this.state.currenttitle}
          waitingForBotResponse={waitingForBotResponse}
          isOpen={this.state.isOpen}
          speechRecognition={this.props.speechRecognition}
          onToggleChat={this.handleToggleChat}
          onButtonClick={this.handleButtonClick}
          onSendMessage={this.sendMessage}
          onSendFile={this.sendFile}
          ref={this.chatroomRef}
          voiceLang={this.props.voiceLang}
          disableForm={this.props.disableForm}
          host={this.state.currenthost}
          stickers={this.state.stickers}
        />
      );
    }
  }
}
