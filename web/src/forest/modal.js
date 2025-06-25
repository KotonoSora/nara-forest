export class Modal {
  constructor() {
    this.modal = null;
    this.overlay = null;
    this.isOpen = false;
    this.createModal();
  }

  createModal() {
    // Create overlay
    this.overlay = document.createElement("div");
    this.overlay.className = "modal-overlay";
    
    // Create modal container
    this.modal = document.createElement("div");
    this.modal.className = "modal-container";
    
    // Create modal header
    const header = document.createElement("div");
    header.className = "modal-header";
    header.innerHTML = `
      <h2>Clock Settings</h2>
      <button class="modal-close-btn" aria-label="Close settings">×</button>
    `;
    
    // Create modal body
    const body = document.createElement("div");
    body.className = "modal-body";
    
    // Create modal content container
    this.content = document.createElement("div");
    this.content.className = "modal-content";
    
    // Assemble modal
    body.appendChild(this.content);
    this.modal.appendChild(header);
    this.modal.appendChild(body);
    this.overlay.appendChild(this.modal);
    
    // Add event listeners
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Close button
    const closeBtn = this.modal.querySelector(".modal-close-btn");
    closeBtn.addEventListener("click", () => this.close());
    
    // Overlay click to close
    this.overlay.addEventListener("click", (e) => {
      if (e.target === this.overlay) {
        this.close();
      }
    });
    
    // Escape key to close
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.isOpen) {
        this.close();
      }
    });
  }

  setContent(content) {
    this.content.innerHTML = "";
    if (content instanceof HTMLElement) {
      this.content.appendChild(content);
    } else {
      this.content.innerHTML = content;
    }
  }

  open() {
    if (this.isOpen) return;
    
    document.body.appendChild(this.overlay);
    this.isOpen = true;
    
    // Add body scroll lock
    document.body.style.overflow = "hidden";
    
    // Trigger animation
    requestAnimationFrame(() => {
      this.overlay.classList.add("modal-open");
    });
  }

  close() {
    if (!this.isOpen) return;
    
    this.overlay.classList.remove("modal-open");
    
    // Wait for animation to complete
    setTimeout(() => {
      if (this.overlay.parentNode) {
        this.overlay.parentNode.removeChild(this.overlay);
      }
      this.isOpen = false;
      
      // Restore body scroll
      document.body.style.overflow = "";
    }, 300); // Match CSS transition duration
  }

  destroy() {
    this.close();
    this.overlay = null;
    this.modal = null;
    this.content = null;
  }
} 