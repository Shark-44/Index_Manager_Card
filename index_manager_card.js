import { LitElement, html, css } from "https://unpkg.com/lit@2/index.js?module";

const API = "http://192.168.1.5:5050/api/appdaemon";

// Déduit le rôle depuis le type d'entity
const TYPE_ROLE = {
  light:         "actionneurs",
  switch:        "actionneurs",
  cover:         "actionneurs",
  climate:       "actionneurs",
  media_player:  "actionneurs",
  fan:           "actionneurs",
  sensor:        "recepteurs",
  binary_sensor: "recepteurs",
  weather:       "recepteurs",
  sun:           "recepteurs",
};

// Icône selon le type
const TYPE_ICONS = {
  light:         "mdi:lightbulb",
  switch:        "mdi:toggle-switch",
  cover:         "mdi:window-shutter",
  climate:       "mdi:thermometer",
  media_player:  "mdi:television-play",
  fan:           "mdi:fan",
  sensor:        "mdi:eye",
  binary_sensor: "mdi:radiobox-marked",
  weather:       "mdi:weather-partly-cloudy",
  sun:           "mdi:weather-sunny",
};

class IndexManagerCard extends LitElement {

  static get properties() {
    return {
      pieces:           { type: Object },
      loading:          { type: Boolean },
      error:            { type: String },
      config:           { type: Object },
      _newPieceName:    { type: String },
      _selectedPiece:   { type: String },
      _showAddForm:     { type: Boolean },  // affiche/cache le formulaire d'ajout
      _newId:           { type: String },
      _newEntity:       { type: String },
      _editComposant:   { type: Object },   // composant en cours de modification
    };
  }

  constructor() {
    super();
    this.pieces          = {};
    this.loading         = true;
    this.error           = null;
    this._newPieceName   = "";
    this._selectedPiece  = null;
    this._showAddForm    = false;
    this._newId          = "";
    this._newEntity      = "";
    this._editComposant  = null;
  }

  setConfig(config) {
    this.config = config;
  }

  connectedCallback() {
    super.connectedCallback();
    this._getPieces();
  }

  // ------------------------------------------------------------------
  // Utilitaire : appel API
  // ------------------------------------------------------------------

  async _api(endpoint, method = "GET", body = null) {
    const options = {
      method,
      headers: { "Content-Type": "text/plain" },
    };
    if (body) options.body = JSON.stringify(body);

    const response = await fetch(`${API}/${endpoint}`, options);
    const json     = await response.json();

    if (!response.ok) {
      throw new Error(json.error || `Erreur ${response.status}`);
    }
    return json;
  }

  // ------------------------------------------------------------------
  // Utilitaires entity
  // ------------------------------------------------------------------

  _getType(entity) {
    return entity.split(".")[0];
  }

  _getRole(entity) {
    const type = this._getType(entity);
    return TYPE_ROLE[type] || "actionneurs";
  }

  _getIcon(entity) {
    const type = this._getType(entity);
    return TYPE_ICONS[type] || "mdi:help-circle-outline";
  }

  // ------------------------------------------------------------------
  // CRUD pièces
  // ------------------------------------------------------------------

  async _getPieces() {
    try {
      this.loading = true;
      this.error   = null;
      this.pieces  = { ...await this._api("pieces", "GET") };
    } catch (e) {
      this.error = e.message || "Impossible de contacter AppDaemon";
    } finally {
      this.loading = false;
    }
  }

  async _addPiece() {
    const nom = this._newPieceName.trim();
    if (!nom) {
      this.error = "Saisis un nom de pièce !";
      return;
    }
    try {
      this.error = null;
      await this._api("pieces", "POST", { nom });
      this._newPieceName = "";
      await this._getPieces();
    } catch (e) {
      this.error = e.message || "Erreur lors de l'ajout";
    }
  }

  async _deletePiece(nom) {
    if (!confirm(`Supprimer la pièce "${nom}" ?`)) return;
    try {
      this.error = null;
      await this._api("pieces", "POST", { nom, action: "delete" });
      await this._getPieces();
    } catch (e) {
      this.error = e.message || "Erreur lors de la suppression";
    }
  }

  // ------------------------------------------------------------------
  // CRUD composants
  // ------------------------------------------------------------------

  async _addComposant() {
    const id     = this._newId.trim();
    const entity = this._newEntity.trim();

    if (!id || !entity) {
      this.error = "Id et entity sont requis !";
      return;
    }

    const type = this._getType(entity);
    const role = this._getRole(entity);

    try {
      this.error = null;
      await this._api("composant", "POST", {
        action: "add",
        piece:  this._selectedPiece,
        role,
        id,
        entity,
        type,
      });
      this._newId       = "";
      this._newEntity   = "";
      this._showAddForm = false;
      await this._getPieces();
    } catch (e) {
      this.error = e.message || "Erreur lors de l'ajout";
    }
  }

  async _updateComposant(c, newEntity) {
    const type = this._getType(newEntity);
    const role = this._getRole(newEntity);
    try {
      this.error = null;
      await this._api("composant", "POST", {
        action: "update",
        piece:  this._selectedPiece,
        role:   c.role,  // rôle original
        id:     c.id,
        entity: newEntity,
        type,
      });
      this._editComposant = null;
      await this._getPieces();
    } catch (e) {
      this.error = e.message || "Erreur lors de la modification";
    }
  }

  async _deleteComposant(c) {
    if (!confirm(`Supprimer "${c.id}" ?`)) return;
    try {
      this.error = null;
      await this._api("composant", "POST", {
        action: "delete",
        piece:  this._selectedPiece,
        role:   c.role,
        id:     c.id,
      });
      await this._getPieces();
    } catch (e) {
      this.error = e.message || "Erreur lors de la suppression";
    }
  }

  // ------------------------------------------------------------------
  // Navigation
  // ------------------------------------------------------------------

  _openPiece(nom) {
    this._selectedPiece = nom;
    this._showAddForm   = false;
    this._editComposant = null;
    this.error          = null;
  }

  _backToList() {
    this._selectedPiece = null;
    this._showAddForm   = false;
    this._editComposant = null;
    this.error          = null;
  }

  // ------------------------------------------------------------------
  // Rendu principal
  // ------------------------------------------------------------------

  render() {
    return this._selectedPiece
      ? this._renderDetail()
      : this._renderListe();
  }

  // ------------------------------------------------------------------
  // Vue 1 : liste des pièces
  // ------------------------------------------------------------------

  _renderListe() {
    return html`
      <ha-card header="Gestion des pièces">
        <div class="card-content">

          ${this.loading ? html`<p>Chargement...</p>` : html``}
          ${this.error   ? html`<p class="error">${this.error}</p>` : html``}

          <div class="pieces-grid">
            ${Object.keys(this.pieces).map(nom => html`
              <div class="piece-card" @click="${() => this._openPiece(nom)}">
                <ha-icon icon="mdi:door"></ha-icon>
                <span>${nom}</span>
                <button class="btn-delete" @click="${(e) => { e.stopPropagation(); this._deletePiece(nom); }}">
                  <ha-icon icon="mdi:trash-can-outline"></ha-icon>
                </button>
              </div>
            `)}
          </div>

          <h3>Ajouter une pièce</h3>
          <div class="add-section">
            <input
              type="text"
              placeholder="Nom de la pièce"
              .value="${this._newPieceName}"
              @input="${e => this._newPieceName = e.target.value}"
              @keydown="${e => e.key === 'Enter' && this._addPiece()}"
            />
            <button @click="${() => this._addPiece()}">Ajouter</button>
          </div>

        </div>
      </ha-card>
    `;
  }

  // ------------------------------------------------------------------
  // Vue 2 : détail d'une pièce
  // ------------------------------------------------------------------

  _renderDetail() {
    const piece       = this.pieces[this._selectedPiece];
    // On enrichit chaque composant avec son rôle pour pouvoir le passer aux méthodes
    const actionneurs = (piece?.actionneurs || []).map(c => ({ ...c, role: "actionneurs" }));
    const recepteurs  = (piece?.recepteurs  || []).map(c => ({ ...c, role: "recepteurs" }));

    return html`
      <ha-card header="${this._selectedPiece}">
        <div class="card-content">

          <!-- Bouton retour -->
          <div class="detail-header">
            <button class="btn-back" @click="${() => this._backToList()}">
              <ha-icon icon="mdi:arrow-left"></ha-icon>
              Pièces
            </button>
          </div>

          ${this.error ? html`<p class="error">${this.error}</p>` : html``}

          <!-- Actionneurs -->
          ${actionneurs.length > 0 ? html`
            <h4 class="section-title">Actionneurs</h4>
            <div class="composants-grid">
              ${actionneurs.map(c => this._renderComposant(c))}
            </div>
          ` : html``}

          <!-- Récepteurs -->
          ${recepteurs.length > 0 ? html`
            <h4 class="section-title">Récepteurs</h4>
            <div class="composants-grid">
              ${recepteurs.map(c => this._renderComposant(c))}
            </div>
          ` : html``}

          <!-- Formulaire ajout -->
          ${this._showAddForm
            ? html`
              <div class="add-form">
                <h4 class="section-title">Nouveau composant</h4>
                <input
                  type="text"
                  placeholder="Id  (ex: lum_salon)"
                  .value="${this._newId}"
                  @input="${e => this._newId = e.target.value}"
                />
                <input
                  type="text"
                  placeholder="Entity  (ex: light.salon)"
                  .value="${this._newEntity}"
                  @input="${e => this._newEntity = e.target.value}"
                />
                <div class="form-hint">
                  ${this._newEntity
                    ? html`→ rôle <b>${this._getRole(this._newEntity)}</b>, type <b>${this._getType(this._newEntity)}</b>`
                    : html``
                  }
                </div>
                <div class="form-actions">
                  <button @click="${() => this._addComposant()}">Confirmer</button>
                  <button class="btn-cancel" @click="${() => { this._showAddForm = false; this.error = null; }}">Annuler</button>
                </div>
              </div>
            `
            : html`
              <button class="btn-add-composant" @click="${() => this._showAddForm = true}">
                <ha-icon icon="mdi:plus-circle-outline"></ha-icon>
                Ajouter un composant
              </button>
            `
          }

        </div>
      </ha-card>
    `;
  }

  // ------------------------------------------------------------------
  // Rendu d'un composant individuel
  // ------------------------------------------------------------------

  _renderComposant(c) {
    const isEditing = this._editComposant?.id === c.id && this._editComposant?.role === c.role;
    const icon      = this._getIcon(c.entity);

    return html`
      <div class="composant-card">
        <ha-icon icon="${icon}"></ha-icon>
        <span class="composant-nom">${c.id}</span>

        ${isEditing
          ? html`
            <input
              class="edit-input"
              type="text"
              .value="${this._editComposant.newEntity}"
              @input="${e => this._editComposant = { ...this._editComposant, newEntity: e.target.value }}"
              @keydown="${e => e.key === 'Enter' && this._updateComposant(c, this._editComposant.newEntity)}"
            />
            <div class="composant-actions">
              <button class="btn-icon" title="Confirmer" @click="${() => this._updateComposant(c, this._editComposant.newEntity)}">
                <ha-icon icon="mdi:check"></ha-icon>
              </button>
              <button class="btn-icon" title="Annuler" @click="${() => this._editComposant = null}">
                <ha-icon icon="mdi:close"></ha-icon>
              </button>
            </div>
          `
          : html`
            <span class="composant-entity">${c.entity}</span>
            <div class="composant-actions">
              <button class="btn-icon" title="Modifier l'entity" @click="${() => this._editComposant = { id: c.id, role: c.role, newEntity: c.entity }}">
                <ha-icon icon="mdi:pencil"></ha-icon>
              </button>
              <button class="btn-icon btn-danger" title="Supprimer" @click="${() => this._deleteComposant(c)}">
                <ha-icon icon="mdi:trash-can-outline"></ha-icon>
              </button>
            </div>
          `
        }
      </div>
    `;
  }

  // ------------------------------------------------------------------
  // Styles
  // ------------------------------------------------------------------

  static get styles() {
    return css`
      .card-content { padding: 16px; }

      .error { color: var(--error-color, red); font-size: 0.9em; }

      /* --- Liste pièces --- */
      .pieces-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 16px;
      }
      .piece-card {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        padding: 15px 12px;
        background: var(--secondary-background-color);
        border-radius: 8px;
        cursor: pointer;
        transition: background 0.2s;
        min-width: 80px;
      }
      .piece-card:hover { background: var(--primary-color); color: white; }
      .piece-card span  { font-weight: 500; font-size: 0.9em; }
      .btn-delete {
        position: absolute;
        top: 4px; right: 4px;
        background: transparent;
        border: none;
        cursor: pointer;
        padding: 2px;
        color: var(--secondary-text-color);
        opacity: 0;
        transition: opacity 0.2s;
      }
      .piece-card:hover .btn-delete { opacity: 1; color: white; }

      h3 { font-size: 0.95em; margin: 8px 0; color: var(--secondary-text-color); }
      .add-section { display: flex; gap: 8px; }

      input {
        flex: 1;
        padding: 8px;
        border: 1px solid var(--divider-color);
        border-radius: 4px;
        background: var(--card-background-color);
        color: var(--primary-text-color);
        font-size: 1em;
        width: 100%;
        box-sizing: border-box;
      }
      button {
        padding: 8px 14px;
        border: none;
        border-radius: 4px;
        background: var(--primary-color);
        color: var(--text-primary-color, white);
        cursor: pointer;
        font-size: 0.9em;
      }
      button:hover { opacity: 0.85; }

      /* --- Vue détail --- */
      .detail-header { margin-bottom: 16px; }
      .btn-back {
        display: flex;
        align-items: center;
        gap: 4px;
        background: var(--secondary-background-color);
        color: var(--primary-text-color);
        padding: 6px 12px;
        border-radius: 20px;
        font-size: 0.9em;
      }
      .section-title {
        font-size: 0.85em;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--secondary-text-color);
        margin: 16px 0 8px 0;
      }
      .composants-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 8px;
      }
      .composant-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        padding: 12px;
        background: var(--secondary-background-color);
        border-radius: 8px;
        min-width: 90px;
      }
      .composant-nom    { font-weight: 500; font-size: 0.9em; }
      .composant-entity { font-size: 0.75em; color: var(--secondary-text-color); }
      .composant-actions {
        display: flex;
        gap: 4px;
        margin-top: 4px;
      }
      .btn-icon {
        background: transparent;
        border: none;
        cursor: pointer;
        padding: 2px;
        color: var(--secondary-text-color);
        border-radius: 4px;
      }
      .btn-icon:hover       { color: var(--primary-color); background: transparent; opacity: 1; }
      .btn-danger:hover     { color: var(--error-color, red); }
      .edit-input           { font-size: 0.8em; padding: 4px; margin-top: 4px; }

      /* --- Formulaire ajout composant --- */
      .add-form {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-top: 16px;
        padding: 12px;
        background: var(--secondary-background-color);
        border-radius: 8px;
      }
      .form-hint { font-size: 0.8em; color: var(--secondary-text-color); min-height: 1.2em; }
      .form-actions { display: flex; gap: 8px; }
      .btn-cancel {
        background: var(--secondary-background-color);
        color: var(--primary-text-color);
        border: 1px solid var(--divider-color);
      }
      .btn-add-composant {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        background: var(--secondary-background-color);
        color: var(--primary-text-color);
        width: 100%;
        padding: 10px;
        border-radius: 8px;
        font-size: 0.9em;
        margin-top: 16px;
      }
    `;
  }
}

customElements.define("index-manager-card", IndexManagerCard);
