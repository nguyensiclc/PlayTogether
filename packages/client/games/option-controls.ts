// Các ô điều khiển dùng chung cho phần "Tuỳ chọn" ở phòng chờ. Mỗi game ghép chúng lại trong `lobby-options.ts` của mình.
// Mọi nút đều có `data-act="opt"`, `data-key`, `data-value`; phòng chờ đọc lại qua `LobbyOptions.read`.

/** Nút chọn một trong nhiều giá trị */
export function segButton(key: string, value: string, label: string, on: boolean, disabled: boolean): string {
  return `<button type="button" class="seg-btn${on ? " on" : ""}" data-act="opt" data-key="${key}" data-value="${value}" aria-pressed="${on}"${disabled ? " disabled" : ""}>${label}</button>`;
}

/** Hàng có công tắc bật/tắt */
export function toggleRow(key: string, label: string, hint: string, on: boolean, disabled: boolean): string {
  return `<div class="opt-row inline">
      <div><b>${label}</b><div class="small muted">${hint}</div></div>
      <button type="button" class="toggle${on ? " on" : ""}" role="switch" aria-checked="${on}" aria-label="${label}" data-act="opt" data-key="${key}" data-value="${!on}"${disabled ? " disabled" : ""}></button>
    </div>`;
}

/** Hàng có nhãn và một nhóm nút chọn */
export const segRow = (label: string, buttons: string[]): string =>
  `<div class="opt-row"><b>${label}</b><div class="seg">${buttons.join("")}</div></div>`;
