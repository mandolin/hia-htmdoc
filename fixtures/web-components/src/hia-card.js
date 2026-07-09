export class HiaCard extends HTMLElement {
  static get observedAttributes() {
    return ["variant", "dismissible"];
  }

  dismiss(source = "button") {
    this.dispatchEvent(new CustomEvent("hia-card-dismiss", {
      bubbles: true,
      composed: true,
      detail: { source }
    }));
  }
}

customElements.define("hia-card", HiaCard);
