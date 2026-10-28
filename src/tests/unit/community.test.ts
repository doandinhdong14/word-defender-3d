import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../../data/db";
import { claimReward, localDate } from "../../data/community";
import type { RunSummary } from "../../types/game";

const profileId = "reward-player";
const run = (overrides: Partial<RunSummary> = {}): RunSummary => ({
  id: "reward-run",
  profileId,
  setId: "set_everyday",
  mode: "copy",
  difficulty: "normal",
  result: "win",
  completedWords: 30,
  independentRecallCorrect: 0,
  wavesCleared: 3,
  totalScore: 100,
  attemptedEntryIds: [],
  startedAt: "",
  endedAt: "",
  coinsEarned: 0,
  xpEarned: 0,
  accuracy: 100,
  wrongKeystrokes: 0,
  hintsUsed: 0,
  ...overrides,
});

describe("pempom reward claims", () => {
  beforeEach(async () => {
    await Promise.all([
      db.rewardClaims.clear(),
      db.wallets.clear(),
      db.ledger.clear(),
      db.runs.clear(),
    ]);
    await db.wallets.add({
      profileId,
      balance: 100,
      totalEarned: 100,
      totalSpent: 0,
    });
  });
  it("credits one daily gift under concurrent claims", async () => {
    const results = await Promise.allSettled([
      claimReward(profileId, `daily:${localDate()}`),
      claimReward(profileId, `daily:${localDate()}`),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect((await db.wallets.get(profileId))?.balance).toBe(150);
    expect(await db.ledger.count()).toBe(1);
  });
  it("rejects unknown and arbitrary-date rewards without changing the wallet", async () => {
    await expect(claimReward(profileId, "anything")).rejects.toThrow();
    await expect(claimReward(profileId, "daily:2000-01-01")).rejects.toThrow();
    expect((await db.wallets.get(profileId))?.balance).toBe(100);
    expect(await db.rewardClaims.count()).toBe(0);
  });
  it("requires this player to win and claims the event only once", async () => {
    await db.runs.add(run({ profileId: "another-player" }));
    await expect(claimReward(profileId, "event:first-win")).rejects.toThrow();
    await db.runs.add(run({ id: "own-run" }));
    await expect(claimReward(profileId, "event:first-win")).resolves.toBe(150);
    await expect(claimReward(profileId, "event:first-win")).rejects.toThrow();
    expect((await db.wallets.get(profileId))?.balance).toBe(250);
  });
  it("requires 30 completed words for the explorer reward", async () => {
    await db.runs.add(run({ completedWords: 29 }));
    await expect(
      claimReward(profileId, "event:word-explorer"),
    ).rejects.toThrow();
    await db.runs.update("reward-run", { completedWords: 30 });
    await expect(claimReward(profileId, "event:word-explorer")).resolves.toBe(
      100,
    );
  });
});
