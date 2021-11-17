import React, { Component, Fragment } from "react";

export default class Splash extends Component {
  state = {
    endSplash: false,
    disable: false
  };

  componentDidMount() {}

  endSplash = () => {
    this.setState({ endSplash: true, disable: true });
    setTimeout(this.props.completeConsent, 1800);
  }

  refuse = () => {
    this.setState({ endSplash: true, disable: true });
    setTimeout(() => { window.location = "https://www.holdingtheocean.org"; }, 1800);
  }

  render() {
    let klass = "splash";
    if (this.state.endSplash){ klass = klass + " end-splash" }

    return (
      <div className={klass}>
        <div className="splash-bg">
          <h1 className="logo">chatbot title</h1>
        </div>
        { this.props.showConsentForm ? (
          <div className="consent-form">
            <div className="avatar">
              <span className="bot-avatar"></span>
            </div>
            <div className="content">
              <h2>Privacy & Consent</h2>
              <p>Before we get started, confirm you are ok with the following?</p>
              <ul>
              <li>We store your progress so that we can continue the conversation later.</li>
              <li>We also use this data to help improve visitor experience.</li></ul>
              <button disabled={this.state.disable} className="agree" onClick={this.endSplash}>OK let's continue</button>
              <button disabled={this.state.disable} onClick={this.refuse}>Not today</button>
            </div>
          </div>
        ) : null}
      </div>
    )
  }
}