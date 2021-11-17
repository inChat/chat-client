> This is a fork of [the chat room projects by Scalableminds](https://github.com/scalableminds/chatroom).
> Main modifications to this codebase are to support user-defined themes as defined on the inChat platform.

# React-based component for Rasa Stack

## Features

* React-based component
* Supports Text with Markdown formatting, Images, and Buttons
* Customizable with SASS variables
* Generates a unique session id and keeps it in `sessionStorage`
* Queues consecutive bot messages for better readability
* Demo mode included (ideal for scripted screencasts)
* Simple setup. Works with Rasa's [REST channel](https://rasa.com/docs/rasa/user-guide/connectors/your-own-website/#rest-channels)
* [Handoff to another bot/host](#setting-up-handoff-capability)

## Usage
1. Embed the `chatroom.js` in the HTML of your website and configure it to connect to your Rasa bot. Either use the S3 hosted version or build it yourself. (see below) You will have to build it yourself to use the handoff capability

```html
<head>
  <link rel="stylesheet" href="http://127.0.0.1:8080/dist/Chatroom.css" />
</head>
<body>
  <div class="chat-container"></div>

  <script src="http://127.0.0.1:8080/dist/Chatroom.js"/></script>
  <script type="text/javascript">
    var chatroom = new window.Chatroom({
      host: "http://localhost:5005",
      title: "Chat with Mike",
      container: document.querySelector(".chat-container"),
      welcomeMessage: "Hi, I am Mike. How may I help you?",
      speechRecognition: "en-US",
      voiceLang: "en-US"
    });
    chatroom.openChat();
  </script>
</body>
```

## Development

### Install dependencies

```
yarn install
```

### Continuously build the Chatroom component

```
yarn watch
yarn serve
```

Open `http://localhost:8080/demo.html` in your browser.

## Build

```
yarn build
```

Distributable files will be created in folder `dist`.

## License

AGPL v3

Credit to [scalable minds](https://scalableminds.com)