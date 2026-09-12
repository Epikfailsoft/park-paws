import { describe, it, expect } from "vitest";
import { accusative, genitive } from "@/lib/turkish";

describe("accusative", () => {
  it.each([
    ["Pamuk", "Pamuk'u"],
    ["Zeytin", "Zeytin'i"],
    ["Karabaş", "Karabaş'ı"],
    ["Köpük", "Köpük'ü"],
    ["Luna", "Luna'yı"],
    ["Köfte", "Köfte'yi"],
    ["Bobo", "Bobo'yu"],
    ["Tüylü", "Tüylü'yü"],
    ["Toby", "Toby'yi"],
    ["Işık", "Işık'ı"],
    [" Pamuk ", "Pamuk'u"],
  ])("%s → %s", (name, expected) => {
    expect(accusative(name)).toBe(expected);
  });
});

describe("genitive", () => {
  it.each([
    ["Pamuk", "Pamuk'un"],
    ["Zeytin", "Zeytin'in"],
    ["Karabaş", "Karabaş'ın"],
    ["Köpük", "Köpük'ün"],
    ["Luna", "Luna'nın"],
    ["Köfte", "Köfte'nin"],
    ["Bobo", "Bobo'nun"],
    ["Tüylü", "Tüylü'nün"],
    ["Toby", "Toby'nin"],
  ])("%s → %s", (name, expected) => {
    expect(genitive(name)).toBe(expected);
  });
});
