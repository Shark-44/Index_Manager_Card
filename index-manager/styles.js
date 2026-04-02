import { css } from "https://unpkg.com/lit@2/index.js?module";

export const styles = css`



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
      `
