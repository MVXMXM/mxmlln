// Keep in sync with .navDynamicContainer bottom in NavBar.css.
var NAV_DOCK_BOTTOM = 'calc(24px + env(safe-area-inset-bottom, 0px))';

//INFO VIEW
    //OPEN INFO VIEW
    function openNavInfoView() {    
        document.body.style.overflow = 'hidden';

        //HIDE CONTROLS
        document.getElementById('navBarSegController').style.transition = 'opacity 0.25s';
        document.getElementById('navBarSegController').style.opacity = 0;
        document.getElementById('navBarSegController').style.visibility = 'hidden';
        document.getElementById('navBar').style.bottom = '-40px';

        //DISPLAY OVERLAY
        document.getElementById('navBarOverlay').style.transition = 'opacity 0.5s';
        document.getElementById('navBarOverlay').style.visibility = 'visible';
        document.getElementById('navBarOverlay').style.opacity = 1;

        //EXPAND CONTAINER
        document.getElementById('navDynamicContainer').style.transition = 'width 0.5s, height 0.5s, left 0.15s';
        document.getElementById('navDynamicContainer').style.height = '450px';

        document.getElementById('infoViewContent').style.transition = 'visibility 1s, opacity 1.5s';
        document.getElementById('infoViewContent').style.visibility = 'visible';
        setTimeout(() => {
            document.getElementById('infoViewContent').style.opacity = '1';
        }, 50);
    }

    //CLOSE INFO VIEW
    function closeNavInfoView() {
        document.body.style.overflow = 'scroll';
        
        document.getElementById('infoViewContent').style.transition = 'visibility 0.15s, opacity 0.15s';
        document.getElementById('infoViewContent').style.visibility = 'hidden';
        document.getElementById('infoViewContent').style.opacity = 0;
        document.getElementById('infoViewContent').style.zIndex = '-1';

        document.getElementById('navDynamicContainer').style.transition = 'left 0.2s, bottom 0.2s, width 0.15s, height 0.15s';
        document.getElementById('navDynamicContainer').style.left = 'calc(50% - 232px)'; 
        document.getElementById('navDynamicContainer').style.bottom = NAV_DOCK_BOTTOM;   
        document.getElementById('navDynamicContainer').style.width = '458px';
        document.getElementById('navDynamicContainer').style.height = '64px';
        document.getElementById('navDynamicContainer').style.borderRadius = '40px';
        document.getElementById('navDynamicContainer').style.background = 'rgba(240, 240, 240, 0.75)';

        document.getElementById('navBarOverlay').style.transition = 'opacity 1s';
        document.getElementById('navBarOverlay').style.opacity = 0;
        setTimeout(function() {
            document.getElementById('navBarOverlay').style.visibility = 'hidden';
        }, 1000);

        document.getElementById('navBar').style.bottom = '0px';
        document.getElementById('navBarSegController').style.visibility = 'visible';
        document.getElementById('navBarSegController').style.transition = 'opacity 1.5s';
        document.getElementById('navBarSegController').style.opacity = 1;
    }


//CHAT VIEW
    //OPEN CHAT VIEW
    function openNavChatView() {    
        document.body.style.overflow = 'hidden';

        document.getElementById('navBarSegController').style.transition = 'opacity 0.25s';
        document.getElementById('navBarSegController').style.opacity = 0;
        document.getElementById('navBarSegController').style.visibility = 'hidden';
        document.getElementById('navBar').style.bottom = '-40px';

        document.getElementById('navBarOverlay').style.transition = 'opacity 0.5s';
        document.getElementById('navBarOverlay').style.visibility = 'visible';
        document.getElementById('navBarOverlay').style.opacity = 1;

        document.getElementById('navDynamicContainer').style.transition = 'width 0.5s, height 0.5s, left 0.15s';
        document.getElementById('navDynamicContainer').style.width = 'calc(100vw - 80px)';
        document.getElementById('navDynamicContainer').style.maxWidth = '800px';
        document.getElementById('navDynamicContainer').style.height = 'calc(100vh - 80px)';
        document.getElementById('navDynamicContainer').style.maxHeight = '800px';
        document.getElementById('navDynamicContainer').style.left = 'calc(50% - 400px)';
        document.getElementById('navDynamicContainer').style.background = 'linear-gradient(45deg, rgba(221, 249, 255, 0.85), rgba(229, 221, 255, 0.85), rgba(254, 231, 224, 0.85))';
        document.getElementById('navDynamicContainer').style.animation = 'gradient 5s ease infinite';
        document.getElementById('navDynamicContainer').style.backgroundSize = '400% 400%';

        if (window.matchMedia("(max-width: 768px)").matches) {
            document.getElementById('chatInputField').addEventListener('focus', function() {
                setTimeout(function() {
                    document.getElementById('navDynamicContainer').style.transition = 'height 0.5s, bottom 0.5s';
                    document.getElementById('navDynamicContainer').style.height = '50vh';
                    document.getElementById('navDynamicContainer').style.bottom = '-2px';
                    document.body.style.overflow = 'hidden';
                }, 500);
            });
            document.getElementById('chatInputField').addEventListener('blur', function() {
                setTimeout(function() {
                    document.getElementById('navDynamicContainer').style.transition = 'height 0.5s, bottom 0.5s';
                    document.getElementById('navDynamicContainer').style.height = '100%';
                    document.getElementById('navDynamicContainer').style.bottom = '-2px';
                }, 500);
            });
            setTimeout(function() {
                document.getElementById('navDynamicContainer').style.borderRadius = '0px';
                document.getElementById('navDynamicContainer').style.height = '100%';
                document.getElementById('navDynamicContainer').style.maxHeight = '100dvh';
                document.getElementById('navDynamicContainer').style.width = '100vw';
                document.getElementById('navDynamicContainer').style.maxWidth = '100vw';
                document.getElementById('navDynamicContainer').style.left = '-4px';
                document.getElementById('navDynamicContainer').style.bottom = '-2px';
            }, 200);
        } else {
        }
        document.getElementById('chatViewContent').style.transition = 'visibility 1s, opacity 1s';
        document.getElementById('chatViewContent').style.visibility = 'visible';
        document.getElementById('chatViewContent').style.opacity = 1;

        document.getElementById('chatResponseLog').style.transition = 'opacity 1s';
        document.getElementById('chatResponseLog').style.opacity = 1;

        if (!window.matchMedia("(max-width: 768px)").matches) {
            setTimeout(function() {
                document.getElementById('chatInputField').focus();
            }, 500);
        }
    }

    //CLOSE CHAT VIEW
    function closeNavChatView() {
        document.body.style.overflow = 'scroll';
        
        document.getElementById('chatViewContent').style.transition = 'visibility 0.15s, opacity 0.15s';
        document.getElementById('chatViewContent').style.visibility = 'hidden';
        document.getElementById('chatViewContent').style.opacity = 0;
        document.getElementById('chatViewContent').style.zIndex = '-1';

        document.getElementById('navDynamicContainer').style.transition = 'left 0.2s, bottom 0.2s, width 0.15s, height 0.15s';
        document.getElementById('navDynamicContainer').style.left = 'calc(50% - 232px)'; 
        document.getElementById('navDynamicContainer').style.bottom = NAV_DOCK_BOTTOM;   
        document.getElementById('navDynamicContainer').style.width = '458px';
        document.getElementById('navDynamicContainer').style.height = '64px';
        document.getElementById('navDynamicContainer').style.borderRadius = '40px';
        document.getElementById('navDynamicContainer').style.background = 'rgba(240, 240, 240, 0.75)';

        document.getElementById('chatResponseLog').style.transition = 'opacity 0.25s';
        document.getElementById('chatResponseLog').style.opacity = 0;

        document.getElementById('navBarOverlay').style.transition = 'opacity 1s';
        document.getElementById('navBarOverlay').style.opacity = 0;
        setTimeout(function() {
            document.getElementById('navBarOverlay').style.visibility = 'hidden';
        }, 1000);

        document.getElementById('navBar').style.bottom = '0px';
        document.getElementById('navBarSegController').style.visibility = 'visible';
        document.getElementById('navBarSegController').style.transition = 'opacity 1.5s';
        document.getElementById('navBarSegController').style.opacity = 1;
    }

//CONTACT VIEW
    //OPEN CONTACT VIEW
    function openNavContactView() {    
        document.body.style.overflow = 'hidden';

        //HIDE CONTROLS
        document.getElementById('navBarSegController').style.transition = 'opacity 0.25s';
        document.getElementById('navBarSegController').style.opacity = 0;
        document.getElementById('navBarSegController').style.visibility = 'hidden';
        document.getElementById('navBar').style.bottom = '-40px';

        //DISPLAY OVERLAY
        document.getElementById('navBarOverlay').style.transition = 'opacity 0.5s';
        document.getElementById('navBarOverlay').style.visibility = 'visible';
        document.getElementById('navBarOverlay').style.opacity = 1;

        //EXPAND CONTAINER
        document.getElementById('navDynamicContainer').style.transition = 'width 0.5s, height 0.5s, left 0.15s';
        document.getElementById('navDynamicContainer').style.height = '360px';

        document.getElementById('contactViewContent').style.transition = 'visibility 1s, opacity 1.5s';
        document.getElementById('contactViewContent').style.visibility = 'visible';
        setTimeout(() => {
            document.getElementById('contactViewContent').style.opacity = '1';
        }, 50);
        document.querySelectorAll('.CircleButton').forEach((button, index) => {
            button.style.width = '0px';
            button.style.height = '0px';
            setTimeout(() => {
                button.style.transition = 'width 0.5s ease-out, height 0.5s ease-out, transform 0.5s ease-out, box-shadow 1s ease';
                button.style.width = '115px';
                button.style.height = '115px';
                button.style.transform = 'translate(-50%, calc(-50% - 10px))';
                setTimeout(() => {
                    button.style.transition = 'width 0.5s, height 0.5s, transform 0.5s, box-shadow 1s ease';
                    button.style.width = '100px';
                    button.style.height = '100px';
                    button.style.transform = 'translate(-50%, -50%)';
                    button.addEventListener('mouseenter', enlargeButton);
                    button.addEventListener('mouseleave', shrinkButton);
                }, 500);
            }, (index + 1) * 75);
        });
    }

    function enlargeButton(event) {
        const button = event.currentTarget;
        button.style.width = '110px';
        button.style.height = '110px';
        button.style.boxShadow = '0px 3px 20px 0px rgba(0, 0, 0, .15)';
    }
    
    function shrinkButton(event) {
        const button = event.currentTarget;
        button.style.width = '100px';
        button.style.height = '100px';
        button.style.boxShadow = '0px 3px 10px 0px rgba(0, 0, 0, 0)';
    }

    //CLOSE CONTACT VIEW
    function closeNavContactView() {
        document.body.style.overflow = 'scroll';

        document.querySelectorAll('.CircleButton').forEach((button) => {
            button.style.transition = 'width 0.15s, height 0.15s, transform 0.15s';
            button.style.width = '0px';
            button.style.height = '0px';
            button.style.transform = 'translateY(-10)';
        });
        
        document.getElementById('contactViewContent').style.transition = 'visibility 0.15s, opacity 0.15s';
        document.getElementById('contactViewContent').style.visibility = 'hidden';
        document.getElementById('contactViewContent').style.opacity = 0;
        document.getElementById('contactViewContent').style.zIndex = '-1';

        document.getElementById('navDynamicContainer').style.transition = 'left 0.2s, bottom 0.2s, width 0.15s, height 0.15s';
        document.getElementById('navDynamicContainer').style.left = 'calc(50% - 232px)'; 
        document.getElementById('navDynamicContainer').style.bottom = NAV_DOCK_BOTTOM;   
        document.getElementById('navDynamicContainer').style.width = '458px';
        document.getElementById('navDynamicContainer').style.height = '64px';
        document.getElementById('navDynamicContainer').style.borderRadius = '40px';
        document.getElementById('navDynamicContainer').style.background = 'rgba(240, 240, 240, 0.75)';

        document.getElementById('navBarOverlay').style.transition = 'opacity 1s';
        document.getElementById('navBarOverlay').style.opacity = 0;
        setTimeout(function() {
            document.getElementById('navBarOverlay').style.visibility = 'hidden';
        }, 1000);

        document.getElementById('navBar').style.bottom = '0px';
        document.getElementById('navBarSegController').style.visibility = 'visible';
        document.getElementById('navBarSegController').style.transition = 'opacity 1.5s';
        document.getElementById('navBarSegController').style.opacity = 1;
    }