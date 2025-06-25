export class FullscreenButton {
  constructor(targetSelector = '#app') {
    this.targetSelector = targetSelector;
    this.button = null;
    this.onFullscreenChange = this.onFullscreenChange.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.createButton();
  }

  createButton() {
    this.button = document.createElement('button');
    this.button.className = 'fullscreen-trigger-btn';
    this.button.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 4H10V2H2V10H4V4Z" fill="currentColor"/>
        <path d="M14 2V4H20V10H22V2H14Z" fill="currentColor"/>
        <path d="M20 20H14V22H22V14H20V20Z" fill="currentColor"/>
        <path d="M4 14H2V22H10V20H4V14Z" fill="currentColor"/>
      </svg>
    `;
    this.button.setAttribute('aria-label', 'Enter fullscreen');
    this.button.setAttribute('title', 'Fullscreen');
    this.button.addEventListener('click', (e) => {
      e.preventDefault();
      this.enterFullscreen();
    });
  }

  enterFullscreen() {
    const app = document.querySelector(this.targetSelector);
    if (app.requestFullscreen) {
      app.requestFullscreen();
    } else if (app.webkitRequestFullscreen) {
      app.webkitRequestFullscreen();
    } else if (app.mozRequestFullScreen) {
      app.mozRequestFullScreen();
    } else if (app.msRequestFullscreen) {
      app.msRequestFullscreen();
    }
  }

  onFullscreenChange() {
    const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
    if (isFullscreen) {
      this.hide();
    } else {
      this.show();
    }
  }

  onKeyDown(e) {
    if ((e.key === 'Escape' || e.key === 'Esc') && (document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement)) {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
  }

  mount() {
    document.body.appendChild(this.button);
    document.addEventListener('fullscreenchange', this.onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', this.onFullscreenChange);
    document.addEventListener('mozfullscreenchange', this.onFullscreenChange);
    document.addEventListener('MSFullscreenChange', this.onFullscreenChange);
    document.addEventListener('keydown', this.onKeyDown);
  }

  hide() {
    if (this.button) this.button.style.display = 'none';
  }

  show() {
    if (this.button) this.button.style.display = '';
  }

  destroy() {
    if (this.button && this.button.parentNode) {
      this.button.parentNode.removeChild(this.button);
    }
    document.removeEventListener('fullscreenchange', this.onFullscreenChange);
    document.removeEventListener('webkitfullscreenchange', this.onFullscreenChange);
    document.removeEventListener('mozfullscreenchange', this.onFullscreenChange);
    document.removeEventListener('MSFullscreenChange', this.onFullscreenChange);
    document.removeEventListener('keydown', this.onKeyDown);
    this.button = null;
  }
} 