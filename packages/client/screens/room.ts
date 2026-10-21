// Màn hình phòng /r/:code (M3): hỏi nickname nếu chưa có, vào phòng, chuyển giữa phòng chờ / bàn chơi / kết quả,
// hiện thanh "Mất kết nối" và khoá bàn khi rớt mạng (UX mục 5, Q22e).

import type { PublicRoom, RoomPreview, ServerMessage, You } from "@playtogether/protocol";
import { $ } from "../dom.ts";
import { gameOf } from "../games/registry.ts";
import type { GameScreen, RoomMessage } from "../games/types.ts";
import { getClientId, getName, rememberRoom, setName } from "../identity.ts";
import { GameSocket } from "../net/socket.ts";
import { showHistory, showRules } from "../rules/rules-dialog.ts";
import { confirmDeleteRoom, memberCount } from "./confirm-leave.ts";
import { LobbyView } from "./lobby.ts";
import { showNickname } from "./nickname.ts";

export async function mountRoom(root: HTMLElement, code: string): Promise<void> {
  if (getName()) {
    new RoomScreen(root, code).start();
    return;
  }
  // Lần đầu vào bằng link: xem trước phòng rồi hỏi tên (UX mục 2.2)
  const preview = await fetchPreview(code);
  if (!preview) {
    showNotFound(root, code);
    return;
  }
  showNickname(root, preview, (name) => {
    setName(name);
    new RoomScreen(root, code).start();
  });
}

async function fetchPreview(code: string): Promise<RoomPreview | null> {
  try {
    const res = await fetch(`/api/rooms/${encodeURIComponent(code)}`);
    return res.ok ? ((await res.json()) as RoomPreview) : null;
  } catch {
    return null;
  }
}

function showNotFound(root: HTMLElement, code: string): void {
  root.innerHTML = `
    <div class="screen not-found">
      <header class="topbar"><a class="logo" href="/"><span class="logo-mark"><i></i></span>PlayTogether</a></header>
      <section class="card">
        <h1>Không tìm thấy phòng ${code}</h1>
        <p class="muted">Phòng có thể đã đóng vì mọi người rời đi, hoặc mã phòng bị gõ nhầm.</p>
        <a class="btn primary block" href="/">Về trang chủ</a>
      </section>
    </div>`;
}

class RoomScreen {
  private readonly code: string;
  private readonly socket: GameSocket;
  private readonly banner: HTMLElement;
  private readonly body: HTMLElement;
  private lobby: LobbyView | null = null;
  private game: GameScreen | null = null;
  /** Người dùng bấm "Về phòng chờ" ở màn kết quả */
  private wantLobby = false;
  private room: PublicRoom | null = null;
  private you: You | null = null;

  constructor(root: HTMLElement, code: string) {
    this.code = code;
    // Mỗi lần (nối lại) kết nối đều gửi hello + joinRoom để server khôi phục đúng ghế (kỹ thuật mục 9)
    this.socket = new GameSocket(() => [
      { type: "hello", clientId: getClientId(), name: getName() ?? "" },
      { type: "joinRoom", code },
    ]);
    root.innerHTML = `
      <div class="banner" hidden><span class="spin"></span>Mất kết nối, đang thử lại…</div>
      <div class="room-body"><div class="screen loading"><p class="muted">Đang vào phòng ${code}…</p></div></div>`;
    this.banner = $(root, ".banner");
    this.body = $(root, ".room-body");
  }

  start(): void {
    this.socket.onMessage((m) => this.handle(m));
    this.socket.onStatus((s) => {
      const online = s === "open";
      // Chỉ hiện thanh đỏ sau khi đã vào phòng, không hiện lúc đang kết nối lần đầu
      this.banner.hidden = online || this.room === null;
      this.game?.setOnline(online);
    });
    this.socket.connect();
  }

  private handle(m: ServerMessage): void {
    if (m.type === "leftRoom") {
      location.assign("/");
      return;
    }
    if (m.type === "error") {
      if (m.code === "ROOM_NOT_FOUND") showNotFound(this.body, this.code);
      else this.game?.rejected(m.code);
      return;
    }
    this.update(m);
  }

  private update(m: RoomMessage): void {
    this.room = m.room;
    this.you = m.you;
    document.title = `Phòng ${m.room.code} · ${gameOf(m.room.gameId).info.name}`;
    rememberRoom({
      code: m.room.code,
      gameId: m.room.gameId,
      with: [...m.room.seats, ...m.room.spectators].flatMap((p) => (p && p.id !== m.you.memberId ? [p.name] : [])),
      at: Date.now(),
    });
    if (m.room.status === "playing") this.wantLobby = false;
    const showGame = m.room.game !== null && (m.room.status === "playing" || !this.wantLobby);
    if (showGame) this.showGame(m);
    else this.showLobby(m.room, m.you);
  }

  /** Người cuối cùng rời thì phải xác nhận, vì phòng sẽ bị xoá */
  private async requestLeave(): Promise<void> {
    if (this.room && memberCount(this.room) <= 1 && !(await confirmDeleteRoom())) return;
    this.socket.send({ type: "leaveRoom" });
  }

  private showGame(m: RoomMessage): void {
    if (this.game) {
      this.game.receive(m);
      return;
    }
    this.lobby = null;
    this.game = gameOf(m.room.gameId).createScreen(this.body, m.room, m.you, {
      move: (move, actionNo) => this.socket.send({ type: "move", move, actionNo }),
      rematch: () => this.socket.send({ type: "rematch" }),
      resign: () => this.socket.send({ type: "resign" }),
      toLobby: () => {
        this.wantLobby = true;
        if (this.room && this.you) this.showLobby(this.room, this.you);
      },
      leave: () => void this.requestLeave(),
      showRules: () => showRules(m.room.gameId),
      showHistory: () => showHistory(m.room.gameId),
    });
    this.game.setOnline(this.socket.isOpen);
  }

  private showLobby(room: PublicRoom, you: You): void {
    this.game?.destroy();
    this.game = null;
    if (!this.lobby) {
      this.lobby = new LobbyView(this.body, {
        takeSeat: (seat) => this.socket.send({ type: "takeSeat", seat }),
        setOptions: (options) => this.socket.send({ type: "setOptions", options }),
        start: () => this.socket.send({ type: "start" }),
        leave: () => void this.requestLeave(),
      });
    }
    this.lobby.render(room, you);
  }
}
