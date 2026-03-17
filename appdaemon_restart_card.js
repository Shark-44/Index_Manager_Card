import { LitElement, html, css } from "https://unpkg.com/lit@2/index.js?module";

class AppdaemonRestartCard extends LitElement {

  static get properties() {
    return {
      hass:     { type: Object },
      config:   { type: Object },
      _status:  { type: String },  // "idle" | "restarting" | "done" | "error"
    };
  }

  constructor() {
    super();
    this._status = "idle";
  }

  setConfig(config) {
    this.config = config;
  }

  async _restart() {
    this._status = "restarting";
    try {
      await this.hass.callService("hassio", "addon_restart", {
        addon: "a0d7b954_appdaemon",  // slug AppDaemon standard
      });
      this._status = "done";
      // Repasser en idle après 3 secondes
      setTimeout(() => this._status = "idle", 3000);
    } catch (e) {
      this._status = "error";
      setTimeout(() => this._status = "idle", 3000);
    }
  }

  render() {
    const labels = {
      idle:       "Redémarrer AppDaemon",
      restarting: "Redémarrage...",
      done:       "✓ Redémarré !",
      error:      "✗ Erreur",
    };
    const icons = {
      idle:       "mdi:restart",
      restarting: "mdi:loading",
      done:       "mdi:check-circle",
      error:      "mdi:alert-circle",
    };

    return html`
      <ha-card>
        <div class="card-content">
          <button
            class="btn btn-${this._status}"
            @click="${() => this._restart()}"
            ?disabled="${this._status === 'restarting'}"
          >
            <ha-icon icon="${icons[this._status]}"></ha-icon>
            ${labels[this._status]}
          </button>
        </div>
      </ha-card>
    `;
  }

  static get styles() {
    return css`
      .card-content {
        padding: 16px;
      }
      .btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        width: 100%;
        padding: 12px;
        border: none;
        border-radius: 8px;
        font-size: 1em;
        cursor: pointer;
        transition: background 0.2s, opacity 0.2s;
      }
      .btn-idle {
        background: var(--primary-color);
        color: var(--text-primary-color, white);
      }
      .btn-restarting {
        background: var(--secondary-background-color);
        color: var(--secondary-text-color);
        cursor: not-allowed;
      }
      .btn-done {
        background: var(--success-color, #4caf50);
        color: white;
      }
      .btn-error {
        background: var(--error-color, red);
        color: white;
      }
      .btn:hover:not([disabled]) {
        opacity: 0.85;
      }
    `;
  }
}

customElements.define("appdaemon-restart-card", AppdaemonRestartCard);
