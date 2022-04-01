// @flow
import React, { useEffect } from "react";
import Markdown from "react-markdown";
import breaks from "remark-breaks";
import { formatDistance } from "date-fns";
import classnames from "classnames";
import type { ChatMessage } from "./Chatroom";
import { noop, handleShortcodes, getAllUrlParams } from "./utils";
import Carousel from "./Carousel";

type MessageTimeProps = {
  time: number,
  isBot: boolean
};

export const MessageTime = ({ time, isBot }: MessageTimeProps) => {
  if (time === 0) return null;

  const messageTime = Math.min(Date.now(), time);
  const messageTimeObj = new Date(messageTime);
  return (
    <React.Fragment>
    <li
      className={classnames("time", isBot ? "left" : "right")}
      title={messageTimeObj.toISOString()}
    >
      { isBot ? (<span className="bot-avatar"></span>) : (null) }
      <span className="sent"> Sent {formatDistance(messageTimeObj, Date.now())} ago</span>
    </li>
    </React.Fragment>
  );
};

type MessageProps = {
  chat: ChatMessage,
  onButtonClick?: (title: string, payload: string) => void,
  voiceLang?: ?string,
  stickers?: Object
};

const supportSpeechSynthesis = () => "SpeechSynthesisUtterance" in window;

const speak = (message: string, voiceLang: string) => {
  const synth = window.speechSynthesis;
  let voices = [];
  voices = synth.getVoices();
  const toSpeak = new SpeechSynthesisUtterance(message);
  toSpeak.voice = voices.find(voice => voice.lang === voiceLang);
  synth.speak(toSpeak);
};

const Message = React.memo(({ chat, onButtonClick, voiceLang = null, stickers = null }: MessageProps) => {
  const message = chat.message;
  const isBot = chat.username === "bot";

  useEffect(() => {
    if (
      isBot &&
      voiceLang != null &&
      message.type === "text" &&
      supportSpeechSynthesis()
    ) {
      speak(message.text, voiceLang);
    }
  }, []);

  switch (message.type) {
    case "locate":
      let hasLocateMessage = (message.locate.message && message.locate.message !== "");
      let finishedLocating = (!onButtonClick);

      useEffect(() => {
        if (onButtonClick) {
          //onButtonClick should only be defined if this was last message
          //useEffect will only run once as if in componentDidMount

          const geolocationOptions = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          };

          const positionUpdateCb = (e) => {
            if (window.positionHistory === undefined) { window.positionHistory = []; }
            window.positionHistory.push({
              "location": {
                "accuracy": e.coords.accuracy,
                "altitude": e.coords.altitude,
                "altitudeAccuracy": e.coords.altitudeAccuracy,
                "heading": e.coords.heading,
                "latitude": e.coords.latitude,
                "longitude": e.coords.longitude,
                "speed": e.coords.speed
              },
              "timestamp": new Date - 0
            });
            if (window.positionHistory.length > 5) { window.positionHistory.shift(); }
          };

          const positionError = (e) => { console.error("Position error", e); }

          const checkLatestPosition = (retry) => {
            if (window.positionHistory === undefined) { //no position history, (yet)
              if ((retry) && (window.watchId !== undefined)) {
                setTimeout(checkLatestPosition, 6000, false); //try again
                return;
              } else {
                onButtonClick(message.locate.errorIntent, message.locate.errorIntent);
                return;
              }
            }

            let timeFiltered = window.positionHistory.filter(p => (((new Date - 0) - p.timestamp)/1000 <= 45));

            const determineScore = (p) => {
              // a combined time and accuracy score, based on 80/20 principle, time is most important
              return ((1+(((new Date - 0) - p.timestamp)/1000)) * 1.8) * ((1+p.location.accuracy) * 1.2);
            };

            let scoreSorted = timeFiltered.sort((a, b) => { return determineScore(a) - determineScore(b) });

            if (scoreSorted.length > 0) {
              const result = scoreSorted[0];
              onButtonClick(
                `[My location](https://www.openstreetmap.org/?mlat=${result.location.latitude}&mlon=${result.location.longitude}#map=19/${result.location.latitude}/${result.location.longitude})`,
                message.locate.intent + JSON.stringify(result)
              );
            } else {
              console.error("No good positions");
              onButtonClick(message.locate.errorIntent, message.locate.errorIntent);
            }
          };

          if (window.watchId === undefined) {
            //Trigger location watching if it hasn't already started
            //console.log("Start watching position");
            window.watchId = navigator.geolocation.watchPosition(positionUpdateCb, positionError, geolocationOptions);
            if (window.watchId = undefined){ window.watchId = 1; } // handle empty return as in some browsers (TODO: research this)
          }

          setTimeout(checkLatestPosition, 6000, true);
        } else {
          console.debug("No need to provide location");
        }
      }, []);

      if (finishedLocating) {
        return null
      } else {
        return (
          <li className={"locate-container"}>
            <span className={"locate-indicator"}></span>
            {hasLocateMessage === true ? (
              <div className="locate-message">
              <Markdown
                source={message.locate.message}
                skipHtml={false}
                allowedTypses={["root", "break"]}
                renderers={{
                  paragraph: ({ children }) => <span>{children}</span>
                }}
                plugins={[breaks]}
              />
              </div>) : null}
          </li>
        )
      }
    case "button":
      return (
        <ul className="chat-buttons">
          {message.buttons.map(({ payload, title, selected }, index) => (
            <li
              className={classnames("chat-button", {
                "chat-button-selected": selected,
                "chat-button-disabled": !onButtonClick
              })}
              key={payload+index}
              onClick={
                onButtonClick != null
                  ? () => onButtonClick(title, payload)
                  : noop
              }
            >
              <Markdown
                source={title}
                skipHtml={false}
                allowedTypses={["root", "break"]}
                renderers={{
                  paragraph: ({ children }) => <span>{children}</span>
                }}
                plugins={[breaks]}
              />
            </li>
          ))}
        </ul>
      );
    case "image":
      return (
        <li className={`chat ${isBot ? "left" : "right"} chat-img`}>
          <img src={message.image} alt="" />
        </li>
      );
    case "soundcloud":
      return (
        <li className={`chat ${isBot ? "left" : "right"} soundcloud`}>
          <div dangerouslySetInnerHTML={{__html: message.embed}}></div><br/><span>{message.title}</span>
        </li>
      );
    case "text":
      let txt = handleShortcodes(stickers, message.text);

      const imageCentre = (map, lat, lng) => {
        const latDiff = Math.abs(map.top) - Math.abs(lat);
        const lngDiff = Math.abs(map.left) - Math.abs(lng);
        const downwards  = (latDiff / map.latPixel);
        const rightwards = (lngDiff / map.lngPixel);
        return [Math.abs(downwards), Math.abs(rightwards)];
      }

      const isWithinBounds = (lat, lng, mapDetails) => {
        return ((lng >= mapDetails.left) && (lng <= mapDetails.right)) && ((lat <= mapDetails.top) && (lat >= mapDetails.bottom));
      }

      const styleBackground = (urlParams, localMap) => {
        if ((urlParams.mlat === undefined) && (urlParams.mlon === undefined)) { return {}; }

        const lat = Number(urlParams.mlat);
        const lng = Number(urlParams.mlon);

        let mapDetails = {};
        if (!localMap){ localMap = {} }

        if (isWithinBounds(lat, lng, localMap)) {
          mapDetails = localMap;
        } else {
          return {}
        }

        const centering = imageCentre(mapDetails, lat, lng);
        const sizing = window.innerWidth / 2;
        let customStyle = {};
        customStyle["width"]  = sizing;
        customStyle["height"] = sizing;
        customStyle["backgroundPositionY"] = (centering[0] * -1) + sizing/2;
        customStyle["backgroundPositionX"] = (centering[1] * -1) + sizing/2;
        customStyle["backgroundSize"] = "unset";
        customStyle["backgroundImage"] = mapDetails.backgroundImage;
        return customStyle;
      }

      const linkRenderer = ({ href, children }) => {
        let customStyle = styleBackground(getAllUrlParams(href));
        return (<a href={href} style={customStyle} target="_blank">
          {children}
        </a>)
      }

      let classes = "chat ";
      if (message.custom && message.custom.class){ classes = classes + message.custom.class }

      return (
        <li className={classnames(classes, isBot ? "left" : "right")}>
          <Markdown
            className="text"
            source={txt}
            skipHtml={false}
            allowedTypes={[
              "root",
              "break",
              "blockquote",
              "paragraph",
              "emphasis",
              "strong",
              "link",
              "list",
              "listItem",
              "image"
            ]}
            renderers={{
              paragraph: ({ children }) => <span>{children}</span>,
              link: linkRenderer
            }}
            plugins={[breaks]}
          />
        </li>
      );
    case "carousel":
      return (
        <Carousel carousel={message.carousel} onButtonClick={onButtonClick} />
      )
    default:
      return null;
  }
});

export default Message;
