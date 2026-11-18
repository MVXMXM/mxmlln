const initialStyles = {
    appStore: {
        opacity: '1',
        height: 'auto',
        width: 'calc(100% - 124px)',
        maxWidth: '800px',
        overflow: 'visible',
        transition: 'all 0.3s ease'
    },
    TitleBlock3: {
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        flexWrap: 'nowrap',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        maxWidth: '800px',
        height: '200px',
        marginTop: '140px',
        marginBottom: '40px',
        opacity: '1',
        overflow: 'hidden',
        transition: 'all 0.3s ease'
    },
    AllStacks: {
        display: 'flex',
        flexDirection: 'row',
        height: 'auto',
        width: '100vw',
        maxWidth: '1024px',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '80px',
        margin: '76px 0 200px',
        //backgroundColor: 'green',
        transition: 'all 0.15s ease'
    },
    CardStackLabelContainer: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        width: '464px',
        height: '464px',
        minHeight: '464px',
        overflow: 'visible',
        //backgroundColor: 'blue',
        margin: '0px',
        transition: 'all 0.25s ease'
    },
    CardStackLabelContainerValue: {
        opacity: '1',
        zIndex: 50,
        filter: 'blur(0px)',
        fontFamily: '"Homemade Apple", cursive',
        fontWeight: 500,
        letterSpacing: '1.5px',
        fontSize: '18px',
        color: '#000000',
        padding: '0px',
        height: '64px',
        width: 'auto',
        flex: '0 0 64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'visible',
        transition: 'all 0.15s ease'
    },
    StackBar: {
        zIndex: '699',
        position: 'fixed',
        top: '-124px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '14px',
        alignItems: 'center',
        padding: '0 16px',
        width: 'auto',
        height: '64px',
        borderRadius: '40px',
        backdropFilter: 'blur(80px)',
        WebkitBackdropFilter: 'blur(80px)',
        backgroundColor: 'rgba(240, 240, 240, 0.75)',
        boxShadow: '0px 3px 30px 0px rgba(0, 0, 0, 0.15)',
        border: 'solid 2px rgba(0, 0, 0, 0.1)',
        fontFamily: '"Homemade Apple", cursive',
        fontWeight: 500,
        letterSpacing: '1.5px',
        fontSize: '18px',
        color: '#000000',
        transition: 'all 0.5s',
        whiteSpace: 'nowrap'
    },
    cardStack: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        flexWrap: 'wrap',
        width: '400px',
        height: '400px',
        flexShrink: '0',
        gap: '0px',
        cursor: 'pointer',
        margin: '0px',
        //backgroundColor: 'red',
        transition: 'all 0.25s ease'
    },
    card: {
        borderRadius: '24px',
        boxShadow: '0 4px 12px oklch(0.25 0.04 260 / 0.12)',
        overflow: 'hidden',
        height: '300px',
        width: '300px',
        border: '10px solid #ffffff',
        backgroundColor: '#000000',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        overflow: 'hidden',
        pointerEvents: 'none',
        transition: 'all 0.35s ease',
    },
    cardShadowLifted: '0 14px 36px oklch(0.25 0.04 260 / 0.18)',
    CardInnerContainer: {
        zIndex: '200',
        position: 'relative',
        boxShadow: '0px 3px 10px 0px rgba(0, 0, 0, 0)',
        height: '0%',
        width: '0%',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        overflow: 'hidden',
        display: 'flex',
        alignContent: 'flex-end',
        backgroundColor: 'transparent',
        opacity: '0',
        backgroundImage: 'linear-gradient(to bottom, rgba(0, 0, 0, 0), rgba(0, 0, 0, 0), rgba(0, 0, 0, 0.5))',
        transition: 'all 0.5s ease'
    },
    CardContent: {
        alignSelf: 'flex-end',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '175px',
        margin: '30px'
    },
    CardBadge: {
        alignSelf: 'flex-start',
        display: 'flex',
        height: '15px',
        padding: '10px',
        marginBottom: '10px',
        borderRadius: '10px',
        color: '#FFFFFF',
        // backdropFilter: 'blur(10px)',
        // webkitBackdropFilter: 'blur(10px)',
        backgroundColor: 'rgba(0, 0, 0, 0.35)'
    },
    BadgeText: {
        paddingLeft: '2px',
        fontFamily: 'Archivo',
        fontWeight: 600,
        letterSpacing: '2px',
        fontSize: '14px'
    },
    CardTitle: {
        color: '#FFFFFF',
        fontFamily: 'Archivo',
        fontWeight: 800,
        fontSize: '32px',
        textShadow: '0px 3px 10px rgba(0, 0, 0, 0.25)',
        textAlign: 'left'
    },
    gradeBG: {
        position: 'fixed',
        zIndex: 1,
        inset: '0',
        top: '0px',
        left: '0px',
        width: 'auto',
        height: 'auto',
        overflow: 'hidden',
        background: 'linear-gradient(10deg, oklch(0.86 0.063 220), oklch(0.82 0.059 275), oklch(0.84 0.048 345), oklch(0.93 0.034 285))',
        backgroundSize: '400% 400%',
        animation: 'gradient 5s ease infinite'
    },
    gradeFront: {
        position: 'fixed',
        zIndex: 2,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '100vw',
        height: '100lvh',
        backgroundColor: 'rgba(255, 255, 255, 0.75)',
        overflow: 'hidden',
        filter: 'blur(150px)',
        borderRadius: '0px',
        transition: 'all 0.5s ease'
    }
};

const stackRandomFactors = new Map();
function getStackRandomFactors(stackId) {
    if (!stackRandomFactors.has(stackId)) {
        stackRandomFactors.set(stackId, {
        rotation: Math.random() * 0.8 - 0.5,
        cardRotations: []
        });
    }
return stackRandomFactors.get(stackId);
}
function setCardPosition(card, index, totalCards, stackId) {
    const stackFactors = getStackRandomFactors(stackId);
    while (stackFactors.cardRotations.length <= index) {
        stackFactors.cardRotations.push((Math.random() - 0.5) * 40);
    }
    let rotation = stackFactors.cardRotations[index];
    let scale = 1;
    if (index > 2) {
        scale = 1 - ((index - 2) / Math.min(totalCards - 2, 97)) * 0.25;
    }
    card.style.transform = `rotate(${rotation.toFixed(2)}deg) scale(${scale.toFixed(2)})`;
    card.style.zIndex = Math.min(totalCards, 6) - index;
    card.style.margin = '-160px';
}

function setDefaultCardStackStyles() {
    const styleSelectors = {
        '.appStore': 'appStore',
        '.TitleBlock3': 'TitleBlock3',
        '.StackBar': 'StackBar',
        '.CardStackLabelContainerValue': 'CardStackLabelContainerValue',
        '.CardInnerContainer': 'CardInnerContainer',
        '.CardContent': 'CardContent',
        '.CardBadge': 'CardBadge',
        '.BadgeText': 'BadgeText',
        '.CardTitle': 'CardTitle',
        '.AllStacks': 'AllStacks',
        '.CardStackLabelContainer': 'CardStackLabelContainer',
        '.CardStack': 'cardStack',
        '.gradeBG': 'gradeBG',
        '.gradeFront': 'gradeFront'
    };

    for (const [selector, styleName] of Object.entries(styleSelectors)) {
        document.querySelectorAll(selector).forEach(element => {
            Object.assign(element.style, initialStyles[styleName]);
        });
    }

    const grid = 16;
    const titleCenter = parseFloat(initialStyles.TitleBlock3.marginTop) + parseFloat(initialStyles.TitleBlock3.height) / 2;
    document.documentElement.style.setProperty('--dot-shift', `${titleCenter - grid / 2}px`);
}
// Card controls
const cards = document.querySelectorAll('.Card');
cards.forEach((card, index) => {
    Object.assign(card.style, initialStyles.card);
    // Card child styles
    const cardStack = card.parentNode;
    const cardsInStack = cardStack.children;
    const cardIndexInStack = Array.prototype.indexOf.call(cardsInStack, card);
    setCardPosition(card, cardIndexInStack, cardsInStack.length, cardStack.id || `stack-${Math.random().toString(36).substr(2, 9)}`);
    
    // Card stack hover styles
    cardStack.addEventListener('mouseover', function(e) {
        handleCardStackHover(e, cardStack);
    });
    
    // Card stack mouse out styles
    cardStack.addEventListener('mouseout', function() {
        handleCardStackMouseOut(cardStack);
    });

    // Existing card hover styles
    cardStack.addEventListener('mouseover', function() {
        const parentCardStackLabelContainer = cardStack.closest('.CardStackLabelContainer');
        if (!parentCardStackLabelContainer || !parentCardStackLabelContainer.classList.contains('expanded')) {
            applyCardHoverStyles(cardStack, cardIndexInStack);
        }
    });

    // Existing card mouse out styles
    cardStack.addEventListener('mouseout', function() {
        const parentCardStackLabelContainer = cardStack.closest('.CardStackLabelContainer');
        if (!parentCardStackLabelContainer || !parentCardStackLabelContainer.classList.contains('expanded')) {
            resetCardStyles(cardStack, cardIndexInStack, cardsInStack.length);
        }
    });
});


function handleCardStackHover(e, cardStack) {
    const parentCardStackLabelContainer = cardStack.closest('.CardStackLabelContainer');
    if (!parentCardStackLabelContainer || !parentCardStackLabelContainer.classList.contains('expanded')) {
        const rect = cardStack.getBoundingClientRect();
        const gradeFront = document.querySelector('.gradeFront');
        gradeFront.style.width = '600px';
        gradeFront.style.height = '600px';
        gradeFront.style.top = (rect.top + rect.height / 2) + 'px';
        gradeFront.style.left = (rect.left + rect.width / 2) + 'px';
        gradeFront.style.filter = 'blur(50px)';
        gradeFront.style.borderRadius = '400px';
    }
}

function handleCardStackMouseOut(cardStack) {
    const parentCardStackLabelContainer = cardStack.closest('.CardStackLabelContainer');
    if (!parentCardStackLabelContainer || !parentCardStackLabelContainer.classList.contains('expanded')) {
        resetGradeFrontStyles();
    }
}

function resetGradeFrontStyles() {
    const gradeFront = document.querySelector('.gradeFront');
    Object.assign(gradeFront.style, initialStyles.gradeFront);
}

function applyCardHoverStyles(cardStack, cardIndexInStack) {
    const cards = cardStack.querySelectorAll('.Card');
    cards.forEach((card, index) => {
        card.style.boxShadow = initialStyles.cardShadowLifted;
        switch (index) {
            case 0:
                card.style.transform = 'translate(-200px, -20px) rotate(-10deg)';
                break;
            case 1:
                card.style.transform = 'translate(0px, 0px) rotate(0deg)';
                break;
            case 2:
                card.style.transform = 'translate(200px, -30px) rotate(10deg)';
                break;
        }
    });

    const otherCardStacks = document.querySelectorAll('.CardStack');
    const allCardStackLabelContainerValues = document.querySelectorAll('.CardStackLabelContainerValue');
    otherCardStacks.forEach((otherCardStack) => {
        if (otherCardStack !== cardStack) {
            otherCardStack.style.opacity = '0.8';
            otherCardStack.style.filter = 'blur(20px)';
            otherCardStack.style.zIndex = '30';
        }
    });
    allCardStackLabelContainerValues.forEach((CardStackLabelContainerValue) => {
        if (!CardStackLabelContainerValue.closest('.CardStackLabelContainer').contains(cardStack)) {
            CardStackLabelContainerValue.style.opacity = '0.8';
            CardStackLabelContainerValue.style.filter = 'blur(20px)';
        }
    });
    cardStack.style.opacity = '1';
    cardStack.style.filter = 'none';
    cardStack.style.zIndex = '800';
    cardStack.closest('.CardStackLabelContainer').querySelector('.CardStackLabelContainerValue').style.opacity = '1';
    cardStack.closest('.CardStackLabelContainer').querySelector('.CardStackLabelContainerValue').style.filter = 'none';
}

function resetCardStyles(cardStack, cardIndexInStack, totalCards) {
    const cards = cardStack.querySelectorAll('.Card');
    cards.forEach((card, index) => {
        card.style.boxShadow = initialStyles.card.boxShadow;
        setCardPosition(card, index, totalCards, cardStack.id || `stack-${Math.random().toString(36).substr(2, 9)}`);
    });

    const otherCardStacks = document.querySelectorAll('.CardStack');
    const allCardStackLabelContainerValues = document.querySelectorAll('.CardStackLabelContainerValue');
    otherCardStacks.forEach((otherCardStack) => {
        otherCardStack.style.transition = 'opacity 0.3s ease, filter 0.3s ease, z-index 0.3s ease';
        otherCardStack.style.opacity = '1';
        otherCardStack.style.filter = 'none';
        otherCardStack.style.zIndex = '100';
    });
    allCardStackLabelContainerValues.forEach((CardStackLabelContainerValue) => {
        CardStackLabelContainerValue.style.transition = 'opacity 0.3s ease, filter 0.3s ease';
        CardStackLabelContainerValue.style.opacity = '1';
        CardStackLabelContainerValue.style.filter = 'none';
    });
    cardStack.style.transition = 'z-index 0.3s ease';
    cardStack.style.zIndex = '100';
}

function loadCards(cardStack = document.querySelector('.CardStack')) {
    const cards = cardStack.querySelectorAll('.Card');
    cards.forEach(function(card) {
        const imageSrc = card.dataset.src;
        const videoSrc = card.dataset.videoSrc;
        
        if (videoSrc) {
            const video = document.createElement('video');
            video.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                object-fit: cover;
                z-index: 0;
            `;
            video.muted = true;
            video.autoplay = true;
            video.loop = true;
            video.playsInline = true;
            video.controls = false;

            // Handle Safari video format
            const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
            const videoSource = isSafari ? videoSrc.replace('.webm', '.mp4') : videoSrc;
            video.src = videoSource;
            
            card.style.overflow = 'hidden';
            card.style.position = 'relative';
            card.appendChild(video);
            
            video.play().catch(error => {
                console.warn('Video autoplay failed:', error);
            });
        } else if (imageSrc) {
            card.style.backgroundImage = `url('${imageSrc}')`;
        }
    });
}


function collapseExpandedStack() {
    if (StackIsExpanded) {
        const expandedCardStackLabelContainer = document.querySelector('.CardStackLabelContainer.expanded');
        if (expandedCardStackLabelContainer) {
            expandCardStackLabelContainer(expandedCardStackLabelContainer);
        }
        StackIsExpanded = false;
    }
}

// Collapse keyboard shortcut
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        collapseExpandedStack();
    }
});

// Expand stack trigger
let StackIsExpanded = false;
const CardStackLabelContainers = document.querySelectorAll('.CardStackLabelContainer');
CardStackLabelContainers.forEach(CardStackLabelContainer => {
    CardStackLabelContainer.addEventListener('click', function(event) {
        if (!StackIsExpanded) {
            event.stopPropagation();
            expandCardStackLabelContainer(this);
            resetGradeFrontStyles();
        }
    });
});

// Expand stack controls
function expandCardStackLabelContainer(CardStackLabelContainer) {
    const AllStacks = document.querySelector('.AllStacks');
    CardStackLabelContainer.classList.toggle('expanded');
    const isExpanded = CardStackLabelContainer.classList.contains('expanded');
    const allCardStackLabelContainers = document.querySelectorAll('.CardStackLabelContainer');
    const cardStack = CardStackLabelContainer.querySelector('.CardStack');
    const allCardStacks = document.querySelectorAll('.CardStack');
    const allCards = document.querySelectorAll('.Card');
    if (isExpanded) {
        StackIsExpanded = true;
        
        const appStore = document.querySelector('.appStore');
        if (appStore) {
            appStore.style.opacity = '0';
            appStore.style.height = '0px';
            appStore.style.width = '0px';
            appStore.style.overflow = 'hidden';
        }
        
        const TitleBlock3 = document.querySelector('.TitleBlock3');
            TitleBlock3.style.opacity = '0';
            TitleBlock3.style.height = '0px';
            TitleBlock3.style.width = '0px';
            TitleBlock3.style.marginTop = '0px';
            TitleBlock3.style.marginBottom = '0px';

        const allCardStackLabelContainerValues = document.querySelectorAll('.CardStackLabelContainerValue');
        allCardStackLabelContainerValues.forEach(CardStackLabelContainerValue => {
            CardStackLabelContainerValue.style.opacity = '0';
            CardStackLabelContainerValue.style.height = '0px';
            CardStackLabelContainerValue.style.width = '0px';
            CardStackLabelContainerValue.style.overflow = 'hidden';
        });
        allCardStackLabelContainers.forEach(label => {
            if (label !== CardStackLabelContainer) {
                label.style.transition = 'width 0.05s ease, height 0.05s ease';
                label.style.width = '0px';
                label.style.height = '0px';
                label.style.overflow = 'hidden';
            }
        });
        allCardStacks.forEach(stack => {
            if (stack !== cardStack) {
                stack.style.transition = 'width 0.05s ease, height 0.05s ease';
                stack.style.width = '0px';
                stack.style.height = '0px';
            }
            stack.style.cursor = 'default';
        });
        allCards.forEach(card => {
            if (card.parentNode !== cardStack) {
                card.style.transition = 'all 0.05s ease';
                card.style.width = '0px';
                card.style.height = '0px';
                card.style.transform = 'none';
                card.style.margin = '0px';
            }
            card.style.pointerEvents = 'auto';
        });
        setTimeout(() => {
            AllStacks.style.maxWidth = '100vw';
            AllStacks.style.gap = '0px';
            AllStacks.style.margin = '0px';
            CardStackLabelContainer.style.transition = 'width 0.1s ease, height 0.1s ease, z-index 0s ease';
            CardStackLabelContainer.style.width = '100vw';
            CardStackLabelContainer.style.height = 'auto';
            CardStackLabelContainer.style.minHeight = 'calc(100dvh)';
            cardStack.style.width = '100%';
            cardStack.style.height = 'auto';
            cardStack.style.gap = '32px';
            cardStack.style.margin = '118px';
            setTimeout(() => {
                const cards = CardStackLabelContainer.querySelectorAll('.Card');
                cards.forEach((card) => {
                    card.style.margin = '0px';
                    card.style.transform = 'translate(0px, 0px) rotate(0deg)';
                    card.style.width = '400px';
                    card.style.height = '400px';
                    card.style.boxShadow = initialStyles.cardShadowLifted;
                });
            }, 50);
            const cardInnerContainers = CardStackLabelContainer.querySelectorAll('.CardInnerContainer');
            cardInnerContainers.forEach((container) => {
                container.style.height = '100%';
                container.style.width = '100%';
            });
            setTimeout(() => {
                cardInnerContainers.forEach((container) => {
                    container.style.opacity = '1';
                });
            }, 500);
            setTimeout(() => {
                const CardStackLabelContainerRect = CardStackLabelContainer.getBoundingClientRect();
                const scrollToPosition = window.scrollY + CardStackLabelContainerRect.top - 0;
                window.scrollTo({
                    top: scrollToPosition,
                    behavior: 'smooth'
                });
            }, 300);
            // lazyLoadCards();

            // setTimeout(() => {
            //     const expandedCardStack = CardStackLabelContainer.querySelector('.CardStack');
            //     if (expandedCardStack) {
            //         lazyLoadCards(expandedCardStack);
            //     }
            // }, 600);

        }, 0);
        // StackBar Setup
        const sectionName = CardStackLabelContainer.querySelector('.CardStackLabelContainerValue').textContent.trim();
        document.getElementById('stackBarSectionName').textContent = sectionName;
        const StackBar = document.getElementById('StackBar');
        StackBar.style.transition = 'top 0.5s, opacity 0.5s, visibility 0.5s';
        StackBar.style.top = '24px';
        StackBar.style.opacity = '1';
        StackBar.style.visibility = 'visible';
    } else {
        StackIsExpanded = false;
        const appStore = document.querySelector('.appStore');
        if (appStore) {
            Object.assign(appStore.style, initialStyles.appStore);
        }
        const stackBar = document.querySelector('.StackBar');
        if (stackBar) {
            Object.assign(stackBar.style, initialStyles.StackBar);
        }
        const cardInnerContainers = document.querySelectorAll('.CardInnerContainer');
        cardInnerContainers.forEach(container => {
            Object.assign(container.style, {
                ...initialStyles.CardInnerContainer,
                transition: 'all 0.1s ease'
            });
        }); 
        allCards.forEach((card) => {
            const cardStack = card.closest('.CardStack');
            const cardIndexInStack = Array.from(cardStack.children).indexOf(card);
            Object.assign(card.style, {
                ...initialStyles.card,
                transition: 'all 0.15s ease'
            });
            setCardPosition(card, cardIndexInStack, cardStack.children.length, cardStack.id || `stack-${Math.random().toString(36).substr(2, 9)}`);
        });
        allCardStacks.forEach(stack => {
            Object.assign(stack.style, {
                ...initialStyles.cardStack,
                transition: 'all 0.15s ease'
            });
        });
        allCardStackLabelContainers.forEach(label => {
            Object.assign(label.style, {
                ...initialStyles.CardStackLabelContainer,
                transition: 'all 0.15s ease'
            });
        });
        const AllStacks = document.querySelector('.AllStacks');
        if (AllStacks) {
            Object.assign(AllStacks.style, {
                ...initialStyles.AllStacks,
                transition: 'all 0.15s ease'
            });
        }
        setTimeout(() => {
            cardInnerContainers.forEach(container => {
                container.style.transition = initialStyles.CardInnerContainer.transition;
            });
            allCards.forEach(card => {
                card.style.transition = initialStyles.card.transition;
            });
            allCardStacks.forEach(stack => {
                stack.style.transition = initialStyles.cardStack.transition;
            });
            allCardStackLabelContainers.forEach(label => {
                label.style.transition = initialStyles.CardStackLabelContainer.transition;
            });
            if (AllStacks) {
                AllStacks.style.transition = initialStyles.AllStacks.transition;
            }
        }, 100);
        const TitleBlock3 = document.querySelector('.TitleBlock3');
        Object.assign(TitleBlock3.style, initialStyles.TitleBlock3);
        const otherCardStacks = document.querySelectorAll('.CardStack');
        const CardStackLabelContainerValues = document.querySelectorAll('.CardStackLabelContainerValue');
        setTimeout(() => {
            window.scrollTo({
                top: CardStackLabelContainer.offsetTop,
                behavior: 'smooth'
            });
            otherCardStacks.forEach((otherCardStack) => {
                otherCardStack.style.pointerEvents = 'none';
            });
            CardStackLabelContainerValues.forEach(CardStackLabelContainerValue => {
                Object.assign(CardStackLabelContainerValue.style, initialStyles.CardStackLabelContainerValue);
            });
        }, 250);
        setTimeout(() => {
            otherCardStacks.forEach((otherCardStack) => {
                otherCardStack.style.opacity = '1';
                otherCardStack.style.filter = 'none';
            });
        }, 250); 
        setTimeout(() => {
            otherCardStacks.forEach((otherCardStack) => {
                otherCardStack.style.pointerEvents = 'auto';
            });
        }, 1000);
    }
}

// Intro Animation
function initIntroAnimation() {
  $('.IntroLoader').animate({width:'300px',height:'300px'}, 500, function() {
    $('.IntroLoader')
      .delay(1000)
      .animate({top:'-100%'}, 250);
  });
  $('.gradeFront').css({width: '525px', height: '525px', borderRadius: '400px', opacity: '1'})
    .delay(1250)
    .animate({width:'100%',height:'100%',borderRadius:'0px'}, 500);
  setTimeout(function() {
    // Leave the about pane put. It shares the page and should not rise with work.
    const $content = $('.ContentContainer').not('.folio-about');
    $content.css('top', '200%').fadeIn(0, function() {
      $content.animate({top: '0px'}, 1000, function() {
        document.body.classList.add('folio-in');
      });
    });
  }, 1000);

  setTimeout(function() {
    $('.navDynamicContainer').css('bottom', '-100px').fadeIn(250, function() {
      $('.navDynamicContainer').animate({bottom: '24px'}, 250, function() {
        this.style.bottom = 'calc(24px + env(safe-area-inset-bottom, 0px))';
      });
    });
    document.querySelector('.folio-dock')?.classList.add('is-in');
  }, 1250);

  $('body').css('overflow-y', 'hidden');
  setTimeout(function() {
    $('body').css('overflow-y', 'auto');
  }, 2500);
}

// Initialize intro animation
$(document).ready(initIntroAnimation);

function youtubeVideoId(href) {
    const match = String(href || '').match(
        /(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/|youtube-nocookie\.com\/embed\/)([A-Za-z0-9_-]{11})/
    );
    return match ? match[1] : null;
}

function youtubeLightboxTitle(source) {
    const title = source.querySelector?.('.CardTitle, .chatCardHeaderTitle');
    const text = title?.textContent?.replace(/\s+/g, ' ').trim();
    return text || 'YouTube video';
}

let youtubeLightbox = null;

function closeYouTubeLightbox() {
    const lightbox = youtubeLightbox;
    if (!lightbox) return;
    youtubeLightbox = null;
    document.removeEventListener('keydown', lightbox.onKey, true);
    window.clearTimeout(lightbox.hintState.timer);
    document.body.style.overflow = lightbox.previousOverflow;
    lightbox.root.querySelector('iframe')?.remove();
    lightbox.root.classList.remove('is-open');
    const remove = (event) => {
        if (event && event.target !== lightbox.root) return;
        lightbox.root.remove();
    };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        remove();
        return;
    }
    lightbox.root.addEventListener('transitionend', remove);
    window.setTimeout(remove, 250);
}

function openYouTubeLightbox(href, source) {
    const id = youtubeVideoId(href);
    if (!id || !source) return false;
    closeYouTubeLightbox();

    const rect = source.getBoundingClientRect();
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dx = rect.left + rect.width / 2 - window.innerWidth / 2;
    const dy = rect.top + rect.height / 2 - window.innerHeight / 2;

    const root = document.createElement('div');
    root.className = 'yt-lightbox';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', youtubeLightboxTitle(source));
    root.tabIndex = -1;

    const stage = document.createElement('div');
    stage.className = 'yt-lightbox-stage';
    if (!reducedMotion) {
        stage.style.transform = `translate(${dx}px, ${dy}px) scale(0.4)`;
    }

    const hint = document.createElement('div');
    hint.className = 'yt-lightbox-hint';
    hint.setAttribute('aria-hidden', 'true');
    const hintKey = document.createElement('kbd');
    hintKey.textContent = 'ESC';
    const hintLabel = document.createElement('span');
    hintLabel.textContent = 'to close';
    hint.append(hintKey, hintLabel);

    const player = document.createElement('div');
    player.className = 'yt-lightbox-player';

    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
    iframe.title = root.getAttribute('aria-label');
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    iframe.allowFullscreen = true;

    player.appendChild(iframe);
    stage.appendChild(hint);
    stage.appendChild(player);
    root.appendChild(stage);

    const hintState = { timer: 0 };
    const showHint = () => {
        root.classList.add('is-hint');
        window.clearTimeout(hintState.timer);
        hintState.timer = window.setTimeout(() => root.classList.remove('is-hint'), 1000);
    };
    const hideHint = () => {
        window.clearTimeout(hintState.timer);
        root.classList.remove('is-hint');
    };
    root.addEventListener('mouseenter', showHint);
    root.addEventListener('mouseleave', hideHint);
    player.addEventListener('mouseenter', hideHint);
    player.addEventListener('mouseleave', showHint);
    root.addEventListener('click', (event) => {
        if (event.target.closest('.yt-lightbox-player')) return;
        closeYouTubeLightbox();
    });

    const onKey = (event) => {
        if (event.key !== 'Escape') return;
        event.preventDefault();
        event.stopImmediatePropagation();
        closeYouTubeLightbox();
    };
    document.addEventListener('keydown', onKey, true);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.body.appendChild(root);
    root.focus({ preventScroll: true });

    youtubeLightbox = { root, onKey, previousOverflow, hintState };

    if (reducedMotion) {
        root.classList.add('is-open');
        stage.style.opacity = '1';
        return true;
    }

    void stage.offsetWidth;
    root.classList.add('is-open');
    stage.style.transition = 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
    stage.style.transform = 'translate(0, 0) scale(1)';
    stage.style.opacity = '1';

    return true;
}

function bindFolioCards() {
    // Handle card links
    document.querySelectorAll('.Card[data-href]').forEach(card => {
        card.addEventListener('click', function() {
            const container = this.closest('.CardStackLabelContainer');
            const featured = this.closest('.folio-masonry.is-result');
            if ((container && container.classList.contains('expanded')) || featured) {
                const href = this.getAttribute('data-href');
                if (!href) return;
                if (openYouTubeLightbox(href, this)) return;
                if (href.startsWith('/blog')) {
                    window.open(href, '_blank', 'noopener,noreferrer');
                } else if (href.startsWith('/')) {
                    window.location.href = href;
                } else {
                    window.open(href, '_blank', 'noopener,noreferrer');
                }
            }
        });
    });

    document.addEventListener('click', function(event) {
        const link = event.target.closest?.('.chatCardURL a');
        if (!link) return;
        if (openYouTubeLightbox(link.getAttribute('href'), link)) {
            event.preventDefault();
        }
    });

    // Handle card zooms
    document.querySelectorAll('.Card#cardZoom').forEach(card => {
        card.addEventListener('click', function(event) {
            event.stopPropagation();
            const video = card.querySelector('video');
            if (video) {
                // Handle video zoom
                const videoModal = document.createElement('div');
                videoModal.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100vw;
                    height: 100vh;
                    margin: 0;
                    padding: 0;
                    background: rgba(0,0,0,0.9);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 9999;
                    cursor: url( "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyRpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNiAoTWFjaW50b3NoKSIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDo3Q0IyNDI3M0FFMkYxMUUzOEQzQUQ5NTMxMDAwQjJGRCIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDo3Q0IyNDI3NEFFMkYxMUUzOEQzQUQ5NTMxMDAwQjJGRCI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOjdDQjI0MjcxQUUyRjExRTM4RDNBRDk1MzEwMDBCMkZEIiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOjdDQjI0MjcyQUUyRjExRTM4RDNBRDk1MzEwMDBCMkZEIi8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+soZ1WgAABp5JREFUeNrcWn9MlVUY/u4dogIapV0gQ0SUO4WAXdT8B5ULc6uFgK3MLFxzFrQFZMtaed0oKTPj1x8EbbZZK5fNCdLWcvxQ+EOHyAQlBgiIVFxAJuUF7YrQ81zOtU+8F+Pe78K1d3s5537f+fE8nPec7z3vOSpJIRkbGwtEEgtdBdVCl0AXQr2hKqgJeg16BdoCrYNWqVSqbif7VQT8YqgB2jTmuDSJNoIcJUJVOVg5EsmH0Oehaj4bGRkZ6uvra2xvb29oamrqbGxs7K2vrx/s7Oy8yffBwcFzdTqdb0REhF9YWFhwSEhIpEajifDw8PAWzY5Cj0GzMUoNUx0R1RQJaJAcgKaw7ujo6O2urq7qysrKioyMjHNDQ0OjU2nP29tbnZ+fv1qv18cFBQWtU6vVs9gN9BvobhDqU5wIKryA5CuoLwj83dzc/NOePXuOlpSUXFNijiUlJS3ct2/fiytWrHgOhGbj0SD0dZD5UREiKOiJJA+axt9Go7F2165deUeOHOmVXCBbt271y8nJyfD3939aPCqCZoCQ2WEiKOQj7HYjzejUqVNFcXFxJdI0SEVFRdKGDRtShbmd5HwEGZM9IupJSHiJBjaazebr2dnZmdNFgsK+2Cf7JgZiEZhsimoSc/oZqh8eHjamp6fvPnTo0O/SDMiOHTsWFRQUHPDy8vLnQEGflZvZpKaFl4WcE7du3epPTU19+/Dhwz3SDMr27dsDioqKcufMmfM45wyIpD3QtPBiC0lgTowcPHgwa6ZJUIiBWIgJP1OB8aVJTQsFnkDSxCUWk60gPj6+VHIjKS8vT8TcSRdLcxhG5g+bpoWH3yF5ube3tw7L33uSGwqW/8/8/Pzoz30PItvuMy080HEZx/CZDQZDgeSmQmzESKwC870jgodcWhPhJx0LDw8vlNxYLl269Cb8Nfp5NP2kuyMiPM8EfvTodkhuLsQoJn4C/VG5ab3CfHd3d41SvpMrhRiBtVrgf01OZBv/nIRID4nIsG6xzBGxs7vK/YSvr2/SVF3xiYL55bVgwYJZp0+f/nOycuvXr38E+xczvOibjvTDLcDg4OBx7GfoD4ZwRPR8gUYbnCUBF3wuHMtPy8rKcmJjY33tleM7lqmpqdnPOo70RazAfNHapFrssaWOjo6Lzg43vj2zPT09febNm7ektLT0C1tk+IzvWIZlWcfR/oC5UWSjSCSUudbW1qvOEqmqqhrcvHnzOzdu3Lhii4ycBMuwLOs42t/ly5etmLUkEsJcbW3tbwq5ETbJ2CLBss70dfbsWSvmpZzsnJTzo6KiEhoaGoaVWlXkwE0mkyXk4+PjE6gUCUpMTMz86urq48gOkIjFWYHfEqf0EkkyJ06cyCMB/iah5OTkTCVIUDQajQf8wl+QNaune/2/c+eOS9olkb+YiYyM9FJ6NGhaHA2OBJV5e6uZI6LVaq2YTSTSz9zatWsfc8X84JzYtGlTJtXeauaorFy5cr7IXieRdubWrFnzpCtIJCYmWpZYKvNKksE/34q5g0RamQsNDV3sKhLy74ySZJYtW2bF3EIidZaFeOnSp5wl0t/fb4aYbJGwRYZlWcfR/mSYL8idRhOcxuTpdBoHBgZuY5Pk0LfrPqdRnE8080Fubm60Aru34QeRoLCMoyQoxCpItFnnCIVBB2kj5GHZj8iw/iDfWJHIaGBgYAyj4u5OghiBdZ00fqby9V0iMK8rSMoYMGZo392JECOwehAztHNipPFjxiGw0UnYuXPnInclQWzEKI0fCH1kL9JoCdAZjcZzAQEB77sjkZ6env3YjK22G6AT8i7DkSzI8KS7kSAmQWJQYL3HabwrjKVK4mQKX9w0g8EQ6i4k9u7dqyUm8TNNYJVsmpbMxL5EkuouxwopKSn+xcXFeeJYoRgkUmVYJyXirgc9ldBnbB302NxYiYJcGc6wgcLCwvysrCztTJgT+xYkzhCTvUPR//9hqBgZkxiZYjao1+vf4vLH4XalKbEP9iVIFIuRME2K9b92MOHCAEOdZS66MJAAAp5iiX0DBI4+ANfUiIhKvMLxOfRVSXaFA2ZQnpmZWefIFY68vLxVMNf4CVc4vuV3wiVXOCZUjkLygXTvpRoTL9Uw9NrS0tJVX1/fc/78+ettbW2WIPXy5cvnRkdHP6rT6QK0Wm0QNkXhGo0mUrjikvTvpZpPQODCFLA4bw6ya06/OnHNqXnGrjnZIyWNXzyjC0GPYIk0fvHM+h+XXzxjnOCcNH7x7KqT/VrSfwQYAOAcX9HTDttYAAAAAElFTkSuQmCC" ) 25 25, no-drop
                `;
                const videoClone = video.cloneNode(true);
                videoClone.style.maxWidth = '100vw';
                videoClone.style.maxHeight = '100vh';
                videoModal.appendChild(videoClone);
                
                videoModal.addEventListener('click', () => {
                    document.body.removeChild(videoModal);
                });
                
                document.body.appendChild(videoModal);
            } else {
                // Existing image zoom functionality
                const bgImage = window.getComputedStyle(this).backgroundImage;
                const imageSrc = bgImage.slice(5, -2);
                if (imageSrc && imageSrc !== 'none') {
                    const img = document.createElement('img');
                    img.style.display = 'none';
                    img.src = imageSrc;
                    document.body.appendChild(img);
                    Intense(img);
                    img.click();
                    img.addEventListener('intense-close', () => document.body.removeChild(img));
                }
            }
        });
    });
}

// `/` injects this classic script after DOMContentLoaded. The same boot
// has to run when that event has already passed.
function bootFolioDocument() {
    setDefaultCardStackStyles();
    document.querySelectorAll('.CardStack').forEach(stack => {
        loadCards(stack);
    });
    bindFolioCards();
    window.__folioReady = true;
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootFolioDocument);
} else {
    bootFolioDocument();
}

