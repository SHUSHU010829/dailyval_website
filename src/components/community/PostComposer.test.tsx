import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ComposerForm } from "@/components/community/PostComposer";

const { notify } = vi.hoisted(() => ({ notify: vi.fn() }));

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string) =>
    `${namespace}.${key}`,
}));
vi.mock("@/components/community/CommunityNoticeProvider", () => ({
  useCommunityNotice: () => ({ notify }),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));
// 其他子元件與選圖無關
vi.mock("@/components/community/Portal", () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}));

const profile = {
  id: "u1",
  displayName: "me",
  tagLine: null,
  rankTier: null,
  isVerified: false,
  isPremium: false,
  avatarURL: null,
};

const file = (name: string) => new File(["x"], name, { type: "image/jpeg" });

function pick(input: HTMLInputElement, files: File[]) {
  // 用真的 FileList 的行為：onChange 之後 input.files 會被清空
  Object.defineProperty(input, "files", {
    configurable: true,
    get: () => files,
  });
  fireEvent.change(input);
}

function renderForm() {
  const { container } = render(
    <ComposerForm
      profile={profile}
      isSubmitting={false}
      onSubmit={vi.fn(async () => true)}
    />,
  );
  return container.querySelector('input[type="file"]') as HTMLInputElement;
}

describe("components/community/ComposerForm image picking", () => {
  let counter = 0;
  afterEach(cleanup);
  beforeEach(() => {
    notify.mockReset();
    counter = 0;
    URL.createObjectURL = vi.fn(() => `blob:preview-${++counter}`);
    URL.revokeObjectURL = vi.fn();
  });

  it("shows a preview for every picked image", () => {
    const input = renderForm();
    pick(input, [file("a.jpg"), file("b.jpg")]);
    const previews = screen.getAllByRole("img");
    expect(previews.map((img) => img.getAttribute("src"))).toEqual([
      "blob:preview-1",
      "blob:preview-2",
    ]);
  });

  it("creates exactly one preview URL per file (no leaks from state updaters)", () => {
    const input = renderForm();
    pick(input, [file("a.jpg")]);
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
  });

  it("keeps what was picked even though the input is cleared afterwards", () => {
    const input = renderForm();
    pick(input, [file("a.jpg")]);
    expect(input.value).toBe("");
    expect(screen.getAllByRole("img")).toHaveLength(1);
  });

  it("caps at five images and tells the user", () => {
    const input = renderForm();
    pick(
      input,
      ["1", "2", "3", "4", "5", "6"].map((n) => file(`${n}.jpg`)),
    );
    expect(screen.getAllByRole("img")).toHaveLength(5);
    expect(notify).toHaveBeenCalledWith(
      "error",
      "communityBoard.composer.imageLimitReached",
    );
  });

  it("falls back to the file name when the browser cannot display the image", () => {
    const input = renderForm();
    pick(input, [file("shot.heic")]);
    fireEvent.error(screen.getByRole("img"));
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByText("shot.heic")).toBeTruthy();
  });

  it("removes a preview and revokes its URL", () => {
    const input = renderForm();
    pick(input, [file("a.jpg"), file("b.jpg")]);
    fireEvent.click(
      screen.getAllByLabelText("communityBoard.composer.removeImage")[0],
    );
    expect(screen.getAllByRole("img")).toHaveLength(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:preview-1");
  });
});
