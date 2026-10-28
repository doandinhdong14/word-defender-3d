import { db } from "./db";

export interface CommunityPost {
  id: string;
  profileId: string;
  author: string;
  content: string;
  createdAt: string;
  kind: "discussion" | "idea";
}
export interface RewardClaim {
  id: string;
  profileId: string;
  rewardId: string;
  amount: number;
  claimedAt: string;
}
export const localDate = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

export async function claimReward(
  profileId: string,
  rewardId: string,
): Promise<number> {
  return db.transaction(
    "rw",
    [db.rewardClaims, db.wallets, db.ledger, db.runs],
    async () => {
      const id = `${profileId}:${rewardId}`;
      if (await db.rewardClaims.get(id))
        throw new Error("Bạn đã nhận phần quà này rồi.");
      let amount: number;
      if (rewardId === `daily:${localDate()}`) amount = 50;
      else if (rewardId === "event:first-win") {
        const wins = await db.runs
          .where("profileId")
          .equals(profileId)
          .filter((r) => r.result === "win")
          .count();
        if (!wins) throw new Error("Thắng một trận Đấu thường để nhận quà.");
        amount = 150;
      } else if (rewardId === "event:word-explorer") {
        const runs = await db.runs
          .where("profileId")
          .equals(profileId)
          .toArray();
        if (runs.reduce((n, r) => n + r.completedWords, 0) < 30)
          throw new Error("Hoàn thành 30 từ trong các trận đấu để nhận quà.");
        amount = 100;
      } else throw new Error("Phần quà không hợp lệ.");
      const wallet = await db.wallets.get(profileId);
      if (!wallet) throw new Error("Hãy đăng nhập để nhận quà.");
      const now = new Date().toISOString();
      await db.wallets.update(profileId, {
        balance: wallet.balance + amount,
        totalEarned: wallet.totalEarned + amount,
      });
      await db.rewardClaims.add({
        id,
        profileId,
        rewardId,
        amount,
        claimedAt: now,
      });
      await db.ledger.add({
        id: `reward:${id}`,
        profileId,
        kind: "earn",
        amount,
        referenceId: rewardId,
        at: now,
      });
      return amount;
    },
  );
}
