class ContactModal {
  constructor(isMobile = false, triggerElementId = null) {
    this.isMobile = isMobile;
    this.modalId = isMobile ? 'ContactModalContainerWrapMob' : 'ContactModalContainerWrap';
    this.containerId = isMobile ? 'ContactModalContainerMob' : 'ContactModalContainer';
    this.closerId = isMobile ? 'ContactCloseMob' : 'ContactClose';
    this.triggerElementId = triggerElementId || (isMobile ? 'ContactMob' : 'Contact');
    this.modalWrap = null;
    this.modalContainer = null;
    this.closer = null;
    this.triggerElement = null;
  }

  bindEvents() {
    this.modalWrap = document.getElementById(this.modalId);
    this.modalContainer = document.getElementById(this.containerId);
    this.closer = document.getElementById(this.closerId);
    this.triggerElement = document.getElementById(this.triggerElementId);

    console.log('Binding events for', this.triggerElementId);
    console.log('Trigger element:', this.triggerElement);

    if (this.triggerElement) {
      this.triggerElement.onclick = (e) => {
        e.preventDefault();
        console.log('Trigger clicked');
        this.open();
      };
    } else {
      console.error('Trigger element not found:', this.triggerElementId);
    }

    if (this.closer) {
      this.closer.onclick = (e) => {
        e.preventDefault();
        console.log('Close clicked');
        this.close();
      };
    } else {
      console.error('Close element not found:', this.closerId);
    }

    window.onclick = (event) => {
      if (event.target == this.modalContainer) {
        console.log('Window clicked, closing modal');
        this.close();
      }
    };
  }

  open() {
    console.log('Opening modal');
    if (this.modalWrap) {
      this.modalWrap.style.display = "block";
      this.modalContainer.className = "ModalContainer";
      this.modalContainer.style.opacity = "1";
    } else {
      console.error('Modal wrap not found:', this.modalId);
    }
  }

  close() {
    console.log('Closing modal');
    if (this.modalContainer) {
      this.modalContainer.className = "ModalContainerfadeOut";
      this.modalWrap.style.display = "block";
      setTimeout(() => { 
        this.modalWrap.style.display = "none";
        console.log('Modal hidden');
      }, 250);
    } else {
      console.error('Modal container not found:', this.containerId);
    }
  }

  render() {
    // Create a container if it doesn't exist
    let container = document.getElementById('contactModalContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'contactModalContainer';
      document.body.appendChild(container);
    }

    // Render the modal HTML into the container
    container.innerHTML += `
      <div class="ModalContainerWrap" id="${this.modalId}">
        <div class="ModalContainer" id="${this.containerId}">
          <div class="Modal">
            <div class="ModalContent">
              <div class="ModalImage" style="background-image: linear-gradient(to bottom, rgba(0, 0, 0, 0), rgba(0, 0, 0, 0.25), rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.75)),
              url(../../assets/MaximillianPiras.jpg);">	
                <div class="ModalImageContent">
                  <img src="assets/Close.png" class="Close" id="${this.closerId}">	
                  <br><br>
                  <div class="CardBadge">
                    <div class="BadgeText">
                      CONTACT
                    </div>
                  </div>
                  <div class="CardTitle">
                    Let's talk design
                  </div>	
                </div>
              </div>
              <div class="ModalBody">
                <div class="ModalIconContainer" width="50px">
                  <div class="ToolTip" id="ToolTip">
                    <div class="ToolTipBadge">
                      <div class="BadgeText">
                        MAX@MXMLLN.COM
                      </div>
                    </div>
                  </div>
                  <a href="mailto:max@mxmlln.com" onclick="gtag('event', 'Click Email Button', { 'event_category' : 'Contact', 'event_label' : 'MAX@MXMLLN.COM'});">
                    <img src="assets/contact/EmailButton.svg" class="CircleButton" alt="Email" />
                  </a>
                </div>
                <div class="ModalIconContainer">
                  <div class="ToolTip" id="ToolTip">
                    <div class="ToolTipBadge">
                      <div class="BadgeText">
                        @MAXIMILLIANNYC
                      </div>
                    </div>
                  </div>
                  <a href="https://x.com/MVXMXM" target="_blank" onclick="gtag('event', 'Click Twitter Button', { 'event_category' : 'Contact', 'event_label' : 'TWITTER'});">
                    <img src="assets/contact/TwitterButton.svg" class="CircleButton" alt="Twitter" />
                  </a>
                </div>
                <div class="ModalIconContainer">
                  <div class="ToolTip" id="ToolTip">
                    <div class="ToolTipBadge">
                      <div class="BadgeText">
                        @MAXIMILLIANNYC
                      </div>
                    </div>
                  </div>
                  <a href="https://www.linkedin.com/in/maximilliannyc/" target="_blank" onclick="gtag('event', 'Click LinkedIn Button', { 'event_category' : 'Contact', 'event_label' : 'LinkedIn'});">
                    <img src="assets/contact/LinkedInButton.svg" class="CircleButton" alt="LinkedIn" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}