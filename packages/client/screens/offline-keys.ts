// Phím tắt của ván chơi (UX mục 3): đổi phím thành hành động theo ngữ cảnh đang hiện trên màn hình.

/** Màn hình đang ở đâu: kết quả, hộp hỏi Lật bàn, hay bàn chơi */
export type KeyContext = "result" | "latBan" | "board";

/** Những hành động mà phím tắt có thể gọi, do màn hình ván chơi cung cấp */
export interface KeyActions {
  context(): KeyContext;
  /** Đang chạy hiệu ứng: chỉ cho tua nhanh */
  isBusy(): boolean;
  /** Đến lượt và nhận thao tác trên bàn */
  canAct(): boolean;
  hasSelection(): boolean;
  canLatBan(): boolean;
  playAgain(): void;
  keepSide(): void;
  latBan(): void;
  toggleFast(): void;
  /** Chọn ô thứ `n` (1–5) từ trái sang trên hàng dưới */
  selectNth(n: number): void;
  sow(arrow: "left" | "right"): void;
  deselect(): void;
}

/** Xử lý một phím; trả về true nếu phím đã được dùng (để chặn hành vi mặc định của trình duyệt). */
export function handleGameKey(e: KeyboardEvent, a: KeyActions): boolean {
  if (e.ctrlKey || e.metaKey || e.altKey) return false;
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  const handlers: Record<KeyContext, (key: string, a: KeyActions) => boolean> = {
    result: keyOnResult,
    latBan: keyOnLatBan,
    board: keyOnBoard,
  };
  return handlers[a.context()](key, a);
}

function keyOnResult(key: string, a: KeyActions): boolean {
  if (key !== "Enter") return false;
  a.playAgain();
  return true;
}

function keyOnLatBan(key: string, a: KeyActions): boolean {
  if (key === "Escape") a.keepSide();
  else if (key === "l") a.latBan();
  else return false;
  return true;
}

function keyOnBoard(key: string, a: KeyActions): boolean {
  if (key === " " && a.isBusy()) {
    a.toggleFast();
    return true;
  }
  if (!a.canAct()) return false;
  if (/^[1-5]$/.test(key)) a.selectNth(Number(key));
  else if (key === "ArrowLeft" && a.hasSelection()) a.sow("left");
  else if (key === "ArrowRight" && a.hasSelection()) a.sow("right");
  else if (key === "Escape") a.deselect();
  else if (key === "l" && a.canLatBan()) a.latBan();
  else return false;
  return true;
}
