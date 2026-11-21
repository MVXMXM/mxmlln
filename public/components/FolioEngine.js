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
        zIndex: '9998',
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
        transition: 'all 0.25s ease'
    },
    card: {
        borderRadius: '24px',
        boxShadow: '0 4px 12px oklch(0.25 0.04 260 / 0.12)',
        overflow: 'hidden',
        height: '300px',
        width: '300px',
        border: '10px solid #ffffff',
        backgroundColor: '#314158',
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
// Touch synthesizes mouseover and leaves the fan open — skip under the mobile breakpoint.
function stackHoverEnabled() {
    return window.matchMedia('(min-width: 769px)').matches;
}

const cards = document.querySelectorAll('.Card');
cards.forEach((card, index) => {
    Object.assign(card.style, initialStyles.card);
    const cardStack = card.parentNode;
    const cardsInStack = cardStack.children;
    const cardIndexInStack = Array.prototype.indexOf.call(cardsInStack, card);
    setCardPosition(card, cardIndexInStack, cardsInStack.length, cardStack.id || `stack-${Math.random().toString(36).substr(2, 9)}`);

    cardStack.addEventListener('mouseover', function(e) {
        if (!stackHoverEnabled()) return;
        handleCardStackHover(e, cardStack);
    });

    cardStack.addEventListener('mouseout', function() {
        if (!stackHoverEnabled()) return;
        handleCardStackMouseOut(cardStack);
    });

    cardStack.addEventListener('mouseover', function() {
        if (!stackHoverEnabled()) return;
        const parentCardStackLabelContainer = cardStack.closest('.CardStackLabelContainer');
        if (!parentCardStackLabelContainer || !parentCardStackLabelContainer.classList.contains('expanded')) {
            applyCardHoverStyles(cardStack, cardIndexInStack);
        }
    });

    cardStack.addEventListener('mouseout', function() {
        if (!stackHoverEnabled()) return;
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

const isSafariVideo = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

function posterSrcForVideo(videoSrc) {
    return videoSrc.replace(/\.webm$/i, '.poster.webp');
}

function resolvedVideoSrc(videoSrc) {
    return isSafariVideo ? videoSrc.replace(/\.webm$/i, '.mp4') : videoSrc;
}

function applyCardPoster(card, videoSrc) {
    const poster = card.dataset.poster || posterSrcForVideo(videoSrc);
    card.style.backgroundImage = `url('${poster}')`;
    card.style.backgroundSize = 'cover';
    card.style.backgroundPosition = 'center';
    card.style.overflow = 'hidden';
    card.style.position = 'relative';
}

function ensureCardCursorHit(card) {
    if (card.querySelector(':scope > .card-cursor-hit')) return;
    // Transparent hit target above <video>; Safari's media layer otherwise eats cursor:url().
    const hit = document.createElement('div');
    hit.className = 'card-cursor-hit';
    hit.style.cssText = 'position:absolute;inset:0;z-index:250;background:transparent;';
    card.appendChild(hit);
}

function unmountCardVideo(card) {
    const wrap = card.querySelector(':scope > .card-media-wrap');
    const video = wrap?.querySelector('video.card-media') || card.querySelector(':scope > video.card-media');
    if (video) {
        video.pause();
        video.removeAttribute('src');
        video.load();
    }
    wrap?.remove();
    if (video && !wrap) video.remove();
    card.querySelector(':scope > .card-cursor-hit')?.remove();
    if (card.dataset.videoSrc) {
        applyCardPoster(card, card.dataset.videoSrc);
    }
}

function mountCardVideo(card) {
    const videoSrc = card.dataset.videoSrc;
    if (!videoSrc) return;
    if (card.querySelector('.card-media-wrap video.card-media, :scope > video.card-media')) {
        ensureCardCursorHit(card);
        return;
    }

    applyCardPoster(card, videoSrc);

    // Contain <video> in the page layer tree — Safari otherwise punches through and kills cursor:url().
    const wrap = document.createElement('div');
    wrap.className = 'card-media-wrap';
    wrap.style.cssText = `
        position: absolute;
        inset: 0;
        z-index: 0;
        overflow: hidden;
        pointer-events: none;
        transform: translateZ(0);
        isolation: isolate;
    `;

    const video = document.createElement('video');
    video.className = 'card-media';
    video.style.cssText = `
        width: 100%;
        height: 100%;
        object-fit: cover;
        pointer-events: none;
        opacity: 0;
        transform: translateZ(0);
    `;
    video.muted = true;
    video.defaultMuted = true;
    video.autoplay = true;
    video.loop = true;
    video.playsInline = true;
    video.controls = false;
    video.preload = 'auto';
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.src = resolvedVideoSrc(videoSrc);

    const reveal = () => {
        video.style.opacity = '0.999';
    };
    video.addEventListener('playing', reveal, { once: true });

    wrap.appendChild(video);
    card.appendChild(wrap);
    ensureCardCursorHit(card);
    video.play().then(reveal).catch(() => {
        // Paused <video> still paints Safari’s native play control.
        unmountCardVideo(card);
    });
}

function dehydrateStackMedia(cardStack) {
    if (!cardStack) return;
    cardStack.querySelectorAll('.Card[data-video-src]').forEach(unmountCardVideo);
}

function hydrateStackMedia(cardStack, { frontOnly = false } = {}) {
    if (!cardStack) return;
    cardStack.querySelectorAll('.Card').forEach((card, index) => {
        if (!card.dataset.videoSrc) return;
        const buried = frontOnly && index > 0;
        if (buried) unmountCardVideo(card);
        else mountCardVideo(card);
    });
}

function loadCards(cardStack = document.querySelector('.CardStack')) {
    if (!cardStack) return;
    cardStack.querySelectorAll('.Card').forEach(function(card) {
        if (card.dataset.videoSrc) {
            applyCardPoster(card, card.dataset.videoSrc);
            return;
        }
        const imageSrc = card.dataset.src;
        if (imageSrc) {
            card.style.backgroundImage = `url('${imageSrc}')`;
            card.style.backgroundSize = 'cover';
            card.style.backgroundPosition = 'center';
        }
    });
}

function whenFolioIn(callback) {
    if (document.body.classList.contains('folio-in') || !document.getElementById('introLoader')) {
        callback();
        return;
    }
    const observer = new MutationObserver(() => {
        if (document.body.classList.contains('folio-in')) {
            observer.disconnect();
            callback();
        }
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
}

function observeCardStackMedia() {
    // Collapsed stacks stay on posters; muted autoplay is blocked until a gesture
    // and a paused <video> leaves Safari’s play control on the card.
    document.querySelectorAll('.CardStack').forEach(dehydrateStackMedia);
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

document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        collapseExpandedStack();
    }
});

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
                stack.style.cursor = 'default';
                dehydrateStackMedia(stack);
            } else {
                stack.style.cursor = '';
            }
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
        // Remount so Safari does not keep a stale video layer that eats cursor:url().
        dehydrateStackMedia(cardStack);
        hydrateStackMedia(cardStack, { frontOnly: false });
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

        }, 0);
        const sectionName = CardStackLabelContainer.querySelector('.CardStackLabelContainerValue').textContent.trim();
        document.getElementById('stackBarSectionName').textContent = sectionName;
        const StackBar = document.getElementById('StackBar');
        StackBar.style.transition = 'top 0.5s, opacity 0.5s, visibility 0.5s';
        StackBar.style.zIndex = initialStyles.StackBar.zIndex;
        StackBar.style.top = '24px';
        StackBar.style.opacity = '1';
        StackBar.style.visibility = 'visible';
    } else {
        StackIsExpanded = false;
        dehydrateStackMedia(cardStack);
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

function skipIntroAnimation() {
  const loader = document.querySelector('.IntroLoader');
  if (loader) loader.style.display = 'none';

  const gradeFront = document.querySelector('.gradeFront');
  if (gradeFront) {
    gradeFront.style.width = '100%';
    gradeFront.style.height = '100%';
    gradeFront.style.borderRadius = '0px';
    gradeFront.style.opacity = '1';
    gradeFront.style.transform = 'translate(-50%, -50%) scale(1)';
    gradeFront.style.transition = '';
  }

  const content = document.querySelector('.ContentContainer');
  if (content) {
    content.style.display = 'flex';
    content.style.top = '0px';
    content.style.visibility = 'visible';
    content.style.transform = 'none';
    content.style.transition = '';
  }

  const nav = document.querySelector('.navDynamicContainer');
  if (nav) {
    nav.style.opacity = '1';
    nav.style.transform = 'none';
    nav.style.pointerEvents = '';
    nav.style.transition = '';
    nav.style.bottom = NAV_DOCK_BOTTOM;
  }

  document.body.classList.add('folio-in');
  document.body.style.overflowY = 'auto';
  document.querySelector('.folio-dock')?.classList.add('is-in');
}

function initIntroAnimation() {
  const loader = document.querySelector('.IntroLoader');
  if (loader) {
    loader.style.transition = 'transform 500ms ease';
    loader.getBoundingClientRect();
    loader.style.transform = 'translate(-50%, -50%) scale(1)';
    setTimeout(function() {
      loader.style.transition = 'transform 250ms ease';
      loader.getBoundingClientRect();
      loader.style.transform = 'translate(-50%, calc(-50% - 100vh)) scale(1)';
    }, 1500);
  }

  const gradeFront = document.querySelector('.gradeFront');
  if (gradeFront) {
    if (window.matchMedia('(max-width: 768px)').matches) {
      gradeFront.style.width = '100%';
      gradeFront.style.height = '100%';
      gradeFront.style.borderRadius = '0px';
      gradeFront.style.transform = 'translate(-50%, -50%) scale(1)';
      gradeFront.style.opacity = '1';
    } else {
      const sx = 525 / Math.max(window.innerWidth, 1);
      const sy = 525 / Math.max(window.innerHeight, 1);
      gradeFront.style.borderRadius = '400px';
      gradeFront.style.transform = `translate(-50%, -50%) scale(${sx}, ${sy})`;
      gradeFront.style.opacity = '1';
      setTimeout(function() {
        gradeFront.style.transition = 'transform 500ms ease, border-radius 500ms ease';
        gradeFront.getBoundingClientRect();
        gradeFront.style.transform = 'translate(-50%, -50%) scale(1)';
        gradeFront.style.borderRadius = '0px';
        setTimeout(function() {
          gradeFront.style.transition = '';
        }, 500);
      }, 1250);
    }
  }

  setTimeout(function() {
    const content = document.querySelector('.ContentContainer');
    if (!content) return;
    content.style.visibility = 'visible';
    content.style.transition = 'transform 1000ms ease';
    content.getBoundingClientRect();
    content.style.transform = 'translateY(0)';
    setTimeout(function() {
      content.style.transition = '';
      document.body.classList.add('folio-in');
    }, 1000);
  }, 1000);

  setTimeout(function() {
    // Next has no .navDynamicContainer — arm the React dock before that early return.
    document.querySelector('.folio-dock')?.classList.add('is-in');
    const nav = document.querySelector('.navDynamicContainer');
    if (!nav) return;
    nav.style.transition = 'opacity 250ms ease';
    nav.getBoundingClientRect();
    nav.style.opacity = '1';
    setTimeout(function() {
      nav.style.transition = 'transform 250ms ease';
      nav.getBoundingClientRect();
      nav.style.transform = 'translateY(0)';
      setTimeout(function() {
        nav.style.transition = '';
        nav.style.pointerEvents = '';
        nav.style.bottom = NAV_DOCK_BOTTOM;
      }, 250);
    }, 250);
  }, 1250);

  document.body.style.overflowY = 'hidden';
  setTimeout(function() {
    document.body.style.overflowY = 'auto';
  }, 2500);
}

window.initIntroAnimation = initIntroAnimation;
window.skipIntroAnimation = skipIntroAnimation;
window.unmountCardVideo = unmountCardVideo;
window.mountCardVideo = mountCardVideo;
window.dehydrateStackMedia = dehydrateStackMedia;
window.hydrateStackMedia = hydrateStackMedia;

function youtubeVideoId(href) {
    const match = String(href || '').match(
        /(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/|youtube-nocookie\.com\/embed\/)([A-Za-z0-9_-]{11})/
    );
    return match ? match[1] : null;
}

function lightboxTitle(sourceEl, fallback) {
    const title = sourceEl?.querySelector?.('.CardTitle, .chatCardHeaderTitle');
    const text = title?.textContent?.replace(/\s+/g, ' ').trim();
    return text || fallback || 'Media';
}

function cardStillSrc(card) {
    const dataSrc = card.getAttribute('data-src');
    if (dataSrc) return dataSrc;
    const bg = window.getComputedStyle(card).backgroundImage;
    const match = bg && bg !== 'none' ? bg.match(/url\(["']?(.*?)["']?\)/i) : null;
    return match?.[1] || null;
}

let activeLightbox = null;

function closeLightbox() {
    const lightbox = activeLightbox;
    if (!lightbox) return;
    activeLightbox = null;
    document.removeEventListener('keydown', lightbox.onKey, true);
    window.clearTimeout(lightbox.hintState.timer);
    document.body.style.overflow = lightbox.previousOverflow;
    lightbox.root.querySelector('video')?.pause();
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

function openLightbox(media) {
    if (!media?.kind || !media.src) return false;
    const youtubeId = media.kind === 'youtube' ? youtubeVideoId(media.src) : null;
    if (media.kind === 'youtube' && !youtubeId) return false;

    closeLightbox();

    const sourceEl = media.sourceEl || null;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const label =
        media.title ||
        lightboxTitle(
            sourceEl,
            media.kind === 'image' ? 'Image' : media.kind === 'video' ? 'Video' : 'YouTube video',
        );

    let dx = 0;
    let dy = 0;
    if (sourceEl?.getBoundingClientRect) {
        const rect = sourceEl.getBoundingClientRect();
        dx = rect.left + rect.width / 2 - window.innerWidth / 2;
        dy = rect.top + rect.height / 2 - window.innerHeight / 2;
    }

    const root = document.createElement('div');
    root.className = 'lightbox';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', label);
    root.tabIndex = -1;

    const stage = document.createElement('div');
    stage.className = 'lightbox-stage';
    if (!reducedMotion && sourceEl) {
        stage.style.transform = `translate(${dx}px, ${dy}px) scale(0.4)`;
    }

    const hint = document.createElement('div');
    hint.className = 'lightbox-hint';
    hint.setAttribute('aria-hidden', 'true');
    const hintKey = document.createElement('kbd');
    hintKey.textContent = 'ESC';
    const hintLabel = document.createElement('span');
    hintLabel.textContent = 'to close';
    hint.append(hintKey, hintLabel);

    const player = document.createElement('div');
    player.className = media.kind === 'image' ? 'lightbox-player is-image' : 'lightbox-player';

    if (media.kind === 'youtube') {
        const iframe = document.createElement('iframe');
        iframe.src = `https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0`;
        iframe.title = label;
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
        iframe.referrerPolicy = 'strict-origin-when-cross-origin';
        iframe.allowFullscreen = true;
        player.appendChild(iframe);
    } else if (media.kind === 'video') {
        const video = document.createElement('video');
        video.src = media.src;
        video.controls = true;
        video.autoplay = true;
        video.playsInline = true;
        video.setAttribute('playsinline', '');
        player.appendChild(video);
    } else {
        const img = document.createElement('img');
        img.src = media.src;
        img.alt = label;
        player.appendChild(img);
    }

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
        if (event.target.closest('.lightbox-player')) return;
        closeLightbox();
    });

    const onKey = (event) => {
        if (event.key !== 'Escape') return;
        event.preventDefault();
        event.stopImmediatePropagation();
        closeLightbox();
    };
    document.addEventListener('keydown', onKey, true);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.body.appendChild(root);
    root.focus({ preventScroll: true });

    activeLightbox = { root, onKey, previousOverflow, hintState };

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

window.openLightbox = openLightbox;
window.closeLightbox = closeLightbox;

function bindFolioCards() {
    document.querySelectorAll('.Card[data-href]').forEach(card => {
        card.addEventListener('click', function() {
            const container = this.closest('.CardStackLabelContainer');
            const featured = this.closest('.folio-masonry.is-result');
            if ((container && container.classList.contains('expanded')) || featured) {
                const href = this.getAttribute('data-href');
                if (!href) return;
                if (openLightbox({ kind: 'youtube', src: href, sourceEl: this })) return;
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
        if (openLightbox({ kind: 'youtube', src: link.getAttribute('href'), sourceEl: link })) {
            event.preventDefault();
        }
    });

    document.querySelectorAll('.Card#cardZoom').forEach(card => {
        card.addEventListener('click', function(event) {
            event.stopPropagation();
            const video = card.querySelector('video');
            if (video) {
                const src = video.currentSrc || video.getAttribute('src') || card.getAttribute('data-video-src');
                if (src) openLightbox({ kind: 'video', src, sourceEl: card });
                return;
            }
            const imageSrc = cardStillSrc(card);
            if (imageSrc) {
                openLightbox({ kind: 'image', src: imageSrc, sourceEl: card });
            }
        });
    });

    document.querySelectorAll('.intense').forEach(el => {
        el.addEventListener('click', function(event) {
            event.preventDefault();
            const src = el.getAttribute('data-image') || el.getAttribute('src') || el.getAttribute('href');
            if (!src) return;
            openLightbox({
                kind: 'image',
                src,
                title: el.getAttribute('data-caption') || el.getAttribute('alt') || 'Image',
                sourceEl: el,
            });
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
    whenFolioIn(observeCardStackMedia);
    bindFolioCards();
    window.__folioReady = true;
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootFolioDocument);
} else {
    bootFolioDocument();
}

