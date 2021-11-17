import React, { useLayoutEffect, useRef, useEffect, useState, useContext } from 'react';

const Carousel = (props) => {
  const scrollContainer = useRef();
  const [leftButton, setLeftButton] = useState(false);
  const [rightButton, setRightButton] = useState(true);
  let currentX, lastX;
  let interactionStarted = false;

  const handleClick = (action) => {
    if (!action || action.type !== 'postback') return;
    const { onButtonClick } = props;
    if (!onButtonClick) return;
    onButtonClick(action.title, action.payload);
  };

  const handleScroll = () => {
    const current = scrollContainer.current;
    if (current.scrollLeft > 0) {
      setLeftButton(true);
    } else {
      setLeftButton(false);
    }
    if (current.clientWidth === current.scrollWidth - current.scrollLeft) {
      setRightButton(false);
    } else {
      setRightButton(true);
    }
  };

  useLayoutEffect(() => {
    const checkButtons = () => {
      if (scrollContainer.current.clientWidth === scrollContainer.current.scrollWidth) {
        setLeftButton(false);
        setRightButton(false);
      } else {
        handleScroll();
      }
    };
    window.addEventListener("resize", checkButtons);
    checkButtons();
  }, [scrollContainer, setRightButton, setLeftButton, handleScroll]);

  const handleLeftArrow = () => {
    scrollContainer.current.scrollTo({
      left: scrollContainer.current.scrollLeft - 230,
      behavior: 'smooth'
    });
  };

  const handleRightArrow = () => {
    scrollContainer.current.scrollTo({
      left: scrollContainer.current.scrollLeft + 230,
      behavior: 'smooth'
    });
  };

  const handleTouchStart = (e) => {
    interactionStarted = true;
    if (e.touches) {
      currentX = e.touches[0].clientX;
    } else {
      currentX = e.clientX;
    }
    lastX = currentX;
    scrollContainer.current.classList.add('grabbing');
    scrollContainer.current.closest('div.chats').classList.add('prevent-scroll');
  }

  const handleTouchMove = (e) => {
    if (!interactionStarted)  { return false; }
    if (e.touches) {
      currentX = e.touches[0].clientX;
    } else {
      currentX = e.clientX;
    }
    scrollContainer.current.scrollTo({
      left: scrollContainer.current.scrollLeft + ((currentX - lastX) * -2),
      behavior: 'smooth'
    });
    lastX = currentX;
    e.preventDefault();
  }

  const handleTouchEnd = (e) => {
    if (interactionStarted) { interactionStarted = false; }
    scrollContainer.current.classList.remove('grabbing');
    scrollContainer.current.closest('div.chats').classList.remove('prevent-scroll');
  }

  const endTouchInteraction = (e) => {
    interactionStarted = false;
    handleTouchEnd(e);
  }

  useEffect(() => {
    const element = scrollContainer.current;
    element.addEventListener('scroll', handleScroll);

    element.addEventListener('touchcancel', endTouchInteraction);
    element.addEventListener('touchstart', handleTouchStart);
    element.addEventListener('touchmove', handleTouchMove);
    element.addEventListener('touchend', handleTouchEnd);

    element.addEventListener('mouseleave', endTouchInteraction);
    element.addEventListener('mousedown', handleTouchStart);
    element.addEventListener('mousemove', handleTouchMove);
    element.addEventListener('mouseup', handleTouchEnd);

    return () => {
      element.removeEventListener('touchcancel', endTouchInteraction);
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('mouseleave', endTouchInteraction);
      element.removeEventListener('mousedown', handleTouchStart);
      element.removeEventListener('mousemove', handleTouchMove);
      element.removeEventListener('mouseup', handleTouchEnd);
    };
  });

  const { linkTarget, carousel, onButtonClick } = props;

  return (
    <React.Fragment>
      <li className="carousel">
        <div className="carousel-container" ref={scrollContainer}>
          {carousel.elements.map((carouselCard, index) => {
            const defaultActionUrl =
              carouselCard.default_action && carouselCard.default_action.type === 'web_url'
                ? carouselCard.default_action.url
                : null;
            return (
              <div className="carousel-card" key={index}>
                <a
                  href={defaultActionUrl}
                  target={linkTarget || '_blank'}
                  rel="noopener noreferrer"
                  onClick={() => handleClick(carouselCard.default_action)}
                >
                  {carouselCard.image_url ? (
                    <img
                      className="carousel-card-image"
                      src={carouselCard.image_url}
                      alt={`${carouselCard.title} ${carouselCard.subtitle}`}
                    />
                  ) : (
                    <div className="carousel-card-image" />
                  )}
                </a>
                <a
                  className="carousel-card-title"
                  href={defaultActionUrl}
                  target={linkTarget || '_blank'}
                  rel="noopener noreferrer"
                  onClick={() => handleClick(carouselCard.default_action)}
                >
                  {carouselCard.title}
                </a>
                <a
                  className="carousel-card-subtitle"
                  href={defaultActionUrl}
                  target={linkTarget || '_blank'}
                  rel="noopener noreferrer"
                  onClick={() => handleClick(carouselCard.default_action)}
                >
                  {carouselCard.subtitle}
                </a>
                <div className="carousel-buttons-container">
                  {carouselCard.buttons.map((button, buttonIndex) => {
                    if (button.type === 'web_url') {
                      return (
                        <a
                          key={buttonIndex}
                          href={button.url}
                          target={linkTarget || '_blank'}
                          rel="noopener noreferrer"
                          className="reply"
                        >
                          <span>{button.title}</span>
                        </a>
                      );
                    }
                    return (
                      <div
                        key={buttonIndex}
                        className="reply"
                        onClick={() => handleClick(button)}
                        role="button"
                        tabIndex={0}
                        disabled={((button.type === 'postback') && (!onButtonClick))}
                      >
                        <span>{button.title}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="carousel-arrows-container">
          {leftButton && (
            <div
              className="left-arrow carousel-arrow"
              onClick={handleLeftArrow}
              role="button"
              tabIndex={0}
            >
              <div className="arrow" alt="left carousel arrow" >←</div>
            </div>
          )}
          {rightButton && (
            <div
              className="right-arrow carousel-arrow"
              onClick={handleRightArrow}
              role="button"
              tabIndex={0}
            >
              <div className="arrow" alt="right carousel arrow">→</div>
            </div>
          )}
        </div>
      </li>

    </React.Fragment>
  );
};

export default Carousel;