import React, { Component, Fragment } from "react";
import classnames from "classnames";

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
    setTimeout(() => { window.location = "https://www.refuselink.org"; }, 1800); //TODO - use from definition
  }

  render() {
    let klass = "splash";
    if (this.state.endSplash){ klass = klass + " end-splash" }

    const bgStyle = { background: this.props.definition.styling["splash-background"] };
    const logoStyle = { backgroundImage: `url("${this.props.definition.styling["splash-logo"]}")` };
    return (
      <div className={klass}>
        <div className={classnames("splash-bg", this.props.showConsentForm ? "" : "no-animation")} style={bgStyle}>
          <h1 className="logo">
            <div className="logo-image" style={logoStyle}></div>
            <span>{this.props.definition.splashTitle}</span>
          </h1>
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