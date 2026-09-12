import { describe, it, expect } from "vitest";
import { photoStoragePath } from "@/lib/upload-validation";

describe("photoStoragePath", () => {
  // The dog-photos storage policy checks (storage.foldername(name))[1] = auth.uid().
  it("starts with the auth user id so the storage policy accepts the upload", () => {
    const file = new File(["x"], "pamuk.jpeg", { type: "image/jpeg" });
    const path = photoStoragePath("auth-user-1", "dogs/dog-9", file);

    expect(path.split("/")[0]).toBe("auth-user-1");
    expect(path).toMatch(/^auth-user-1\/dogs\/dog-9\/\d+\.jpeg$/);
  });
});
