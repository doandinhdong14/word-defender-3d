import React, { useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  Coins,
  Copy,
  Gift,
  Lightbulb,
  MessageCircle,
  Send,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import { useApp } from "../app/appStore";
import { useAuth } from "../auth/AuthContext";
import { db } from "../data/db";
import { claimReward, CommunityPost, localDate } from "../data/community";
import { PublishedMessages } from '../components/PublishedMessages';

export const LeaderboardPage: React.FC = () => {
  const { account } = useAuth();
  const [tab, setTab] = useState("ranking");
  const [ranking, setRanking] = useState<
    { id: string; name: string; score: number; words: number; wins: number }[]
  >([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [content, setContent] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const load = async () => {
    const [profiles, runs, discussions] = await Promise.all([
      db.profiles.toArray(),
      db.runs.toArray(),
      db.communityPosts.where("kind").equals("discussion").sortBy("createdAt"),
    ]);
    setRanking(
      profiles
        .map((p) => {
          const played = runs.filter(
            (r) => r.profileId === p.id && r.result !== "quit",
          );
          return {
            id: p.id,
            name: p.name,
            score: Math.max(0, ...played.map((r) => r.totalScore)),
            words: played.reduce((sum, r) => sum + r.completedWords, 0),
            wins: played.filter((r) => r.result === "win").length,
          };
        })
        .filter((p) => p.score > 0)
        .sort((a, b) => b.score - a.score),
    );
    setPosts(discussions.reverse());
  };
  useEffect(() => {
    void load().catch(() =>
      setNotice("Không tải được dữ liệu. Vui lòng thử lại."),
    );
  }, []);
  const post = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account || !content.trim() || busy) return;
    setBusy(true);
    try {
      await db.communityPosts.add({
        id: crypto.randomUUID(),
        profileId: account.id,
        author: account.displayName,
        content: content.trim(),
        createdAt: new Date().toISOString(),
        kind: "discussion",
      });
      setContent("");
      await load();
    } catch {
      setNotice("Chưa gửi được tin nhắn. Vui lòng thử lại.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="portal-page">
      <div className="page-heading">
        <h1>Bảng xếp hạng</h1>
      </div>
      <div className="pill-tabs">
        <button
          className={tab === "ranking" ? "active" : ""}
          onClick={() => setTab("ranking")}
        >
          <Trophy size={17} /> Bảng xếp hạng
        </button>
        <button
          className={tab === "forum" ? "active" : ""}
          onClick={() => setTab("forum")}
        >
          <MessageCircle size={17} /> Diễn đàn
        </button>
      </div>
      <p className="notice">
        Dữ liệu trên trình duyệt này. Bảng xếp hạng toàn cầu và trò chuyện giữa
        các thiết bị sẽ mở khi kết nối máy chủ.
      </p>
      {tab === "ranking" ? (
        <div className="surface ranking-table">
          <div className="ranking-row table-head">
            <span>HẠNG</span>
            <span>NGƯỜI CHƠI</span>
            <span>ĐIỂM CAO NHẤT</span>
            <span>TỪ HOÀN THÀNH</span>
            <span>TRẬN THẮNG</span>
          </div>
          {ranking.length ? (
            ranking.map((p, i) => (
              <div
                className={`ranking-row ${p.id === account?.id ? "is-me" : ""}`}
                key={p.id}
              >
                <span className={`rank rank-${i + 1}`}>
                  {i < 3 ? <Trophy size={21} /> : i + 1}
                </span>
                <strong>
                  {p.name}
                  {p.id === account?.id && <small> · Bạn</small>}
                </strong>
                <strong>{p.score.toLocaleString("vi-VN")}</strong>
                <span>{p.words}</span>
                <span>{p.wins}</span>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <Trophy size={46} />
              <h3>Ngôi đầu đang chờ bạn.</h3>
              <p>Hoàn thành trận đầu tiên để xuất hiện trên bảng xếp hạng.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="forum-layout">
          <div className="surface">
            <div className="section-heading">
              <MessageCircle size={21} />
              <h2>Góc chuyện trò</h2>
            </div>
            <form onSubmit={post} className="post-form">
              <label htmlFor="forum-post">Chia sẻ với cộng đồng</label>
              <textarea
                id="forum-post"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                maxLength={1000}
                placeholder={
                  account
                    ? "Hôm nay bạn học được từ gì mới?"
                    : "Đăng nhập trong mục Tài khoản để viết bài."
                }
                disabled={!account}
                required
              />
              <div>
                <span>{content.length}/1000</span>
                <button
                  className="primary-button"
                  disabled={!account || !content.trim() || busy}
                >
                  <Send size={16} />
                  {busy ? "Đang gửi…" : "Đăng bài"}
                </button>
              </div>
            </form>
            {posts.map((p) => (
              <article className="forum-post" key={p.id}>
                <span className="post-avatar">{p.author.charAt(0)}</span>
                <div>
                  <strong>{p.author}</strong>
                  <time>{new Date(p.createdAt).toLocaleString("vi-VN")}</time>
                  <p>{p.content}</p>
                </div>
              </article>
            ))}
            {!posts.length && (
              <p className="empty-copy">
                Chưa có bài viết. Hãy mở đầu câu chuyện!
              </p>
            )}
          </div>
          <aside className="surface forum-rules">
            <Users size={28} />
            <h3>Một góc nhỏ thân thiện.</h3>
            <p>
              Chia sẻ cách học, hỏi một từ khó hoặc kể về chiến thắng của bạn.
              Tôn trọng và cổ vũ lẫn nhau nhé.
            </p>
          </aside>
        </div>
      )}
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
    </div>
  );
};

export const GiftsPage: React.FC = () => {
  const { account } = useAuth();
  const { navigateTo, refreshUserData } = useApp();
  const [claimed, setClaimed] = useState(false);
  const [notice, setNotice] = useState("");
  const [idea, setIdea] = useState("");
  const [busy, setBusy] = useState(false);
  const [savedIdeas, setSavedIdeas] = useState<CommunityPost[]>([]);
  useEffect(() => {
    if (account) {
      void db.rewardClaims
        .get(`${account.id}:daily:${localDate()}`)
        .then((c) => setClaimed(Boolean(c)));
      void db.communityPosts
        .where("profileId")
        .equals(account.id)
        .filter((p) => p.kind === "idea")
        .toArray()
        .then(setSavedIdeas);
    }
  }, [account]);
  const claim = async () => {
    if (!account) {
      navigateTo("account");
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      const n = await claimReward(account.id, `daily:${localDate()}`);
      setClaimed(true);
      await refreshUserData();
      setNotice(`Tada! Bạn đã nhận ${n} xu. Hẹn gặp lại ngày mai!`);
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const saveIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account || !idea.trim() || busy) return;
    setBusy(true);
    try {
      const p: CommunityPost = {
        id: crypto.randomUUID(),
        profileId: account.id,
        author: account.displayName,
        content: idea.trim(),
        createdAt: new Date().toISOString(),
        kind: "idea",
      };
      await db.communityPosts.add(p);
      setSavedIdeas([...savedIdeas, p]);
      setIdea("");
      setNotice(
        "Đã lưu ý tưởng trên thiết bị. Bạn có thể sao chép để chia sẻ với đội ngũ pempom.",
      );
    } catch {
      setNotice("Chưa lưu được ý tưởng. Hãy thử lại.");
    } finally {
      setBusy(false);
    }
  };
  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setNotice("Đã sao chép!");
    } catch {
      setNotice(`Bạn có thể sao chép thủ công: ${value}`);
    }
  };
  const referral = account
    ? `PEMPOM-${account.id
        .replace(/[^a-z0-9]/gi, "")
        .slice(-10)
        .toUpperCase()}`
    : "";
  return (
    <div className="portal-page">
      <div className="page-heading">
        <h1>Quà tặng</h1>
      </div>
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      <div className="gift-grid">
        <section className="surface daily-gift">
          <span className="tag green">QUÀ HẰNG NGÀY</span>
          <div className="big-gift">
            <Gift size={90} strokeWidth={1.3} />
            <Sparkles size={28} />
          </div>
          <h2>Mở quà lấy hên!</h2>
          <p>
            50 xu cho một ngày đầy năng lượng.
            <br />
            Mỗi tài khoản nhận một lần mỗi ngày.
          </p>
          <button
            className="primary-button"
            onClick={claim}
            disabled={claimed || busy}
          >
            {claimed ? <Check size={18} /> : <Gift size={18} />}
            {claimed
              ? "Đã nhận hôm nay"
              : busy
                ? "Đang mở…"
                : "Mở quà · +50 xu"}
          </button>
        </section>
        <section className="surface">
          <div className="section-heading">
            <Lightbulb size={24} />
            <h2>Ý tưởng của bạn</h2>
          </div>
          <p>
            Điều gì sẽ làm pempom vui hơn? Lưu lại để cùng xây dựng thế giới
            này.
          </p>
          <form className="post-form" onSubmit={saveIdea}>
            <label htmlFor="idea">Góp một ý tưởng</label>
            <textarea
              id="idea"
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              maxLength={2000}
              placeholder="Mình muốn có một bản đồ…"
              required
              disabled={!account}
            />
            <button
              className="primary-button"
              disabled={!account || !idea.trim() || busy}
            >
              <Send size={16} /> Lưu ý tưởng
            </button>
          </form>
          {!account && (
            <button
              className="text-button"
              onClick={() => navigateTo("account")}
            >
              Đăng nhập để góp ý <ArrowRight size={15} />
            </button>
          )}
          {savedIdeas.map((p) => (
            <div className="saved-idea" key={p.id}>
              <p>{p.content}</p>
              <button className="text-button" onClick={() => copy(p.content)}>
                <Copy size={14} /> Sao chép
              </button>
            </div>
          ))}
        </section>
        <section className="surface referral-card">
          <Users size={33} />
          <h2>Niềm vui nhân đôi.</h2>
          <p>
            Giới thiệu bạn bè nhận quà. Mã của bạn đã sẵn sàng; phần thưởng giới
            thiệu sẽ mở khi có hệ thống xác thực lời mời.
          </p>
          {account ? (
            <>
              <div className="referral-code">{referral}</div>
              <button
                className="secondary-button"
                onClick={() => {
                  const url = new URL(
                    import.meta.env.BASE_URL,
                    location.origin,
                  );
                  url.searchParams.set("ref", referral);
                  void copy(url.href);
                }}
              >
                <Copy size={16} /> Sao chép lời mời
              </button>
            </>
          ) : (
            <button
              className="secondary-button"
              onClick={() => navigateTo("account")}
            >
              Đăng nhập để lấy mã
            </button>
          )}
          <span className="tag">SẮP MỞ THƯỞNG GIỚI THIỆU</span>
        </section>
      </div>
    </div>
  );
};

export const EventsPage: React.FC = () => {
  const { account } = useAuth();
  const { navigateTo, refreshUserData } = useApp();
  const [wins, setWins] = useState(0),
    [words, setWords] = useState(0);
  const [claimed, setClaimed] = useState<string[]>([]),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!account) return;
    void Promise.all([
      db.runs.where("profileId").equals(account.id).toArray(),
      db.rewardClaims.where("profileId").equals(account.id).toArray(),
    ]).then(([runs, claims]) => {
      setWins(runs.filter((r) => r.result === "win").length);
      setWords(runs.reduce((n, r) => n + r.completedWords, 0));
      setClaimed(claims.map((c) => c.rewardId));
    });
  }, [account]);
  const claim = async (id: string) => {
    if (!account || busy) return;
    setBusy(true);
    try {
      const n = await claimReward(account.id, id);
      setClaimed([...claimed, id]);
      await refreshUserData();
      setNotice(`Đã nhận ${n} xu. Làm tốt lắm, nhà thám hiểm!`);
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="portal-page">
      <div className="page-heading">
        <h1>Sự kiện</h1>
        <p>Nhiệm vụ khởi đầu dành cho mọi nhà thám hiểm pempom.</p>
      </div>
      <PublishedMessages type="event" />
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      <div className="event-banner">
        <div>
          <span className="tag">NHIỆM VỤ THƯỜNG TRỰC</span>
          <h2>
            Hành trình bắt đầu
            <br />
            từ một từ mới.
          </h2>
          <p>Vào Đấu thường, hoàn thành nhiệm vụ và nhận xu.</p>
          <button className="primary-button" onClick={() => navigateTo("home")}>
            Về sảnh chơi <ArrowRight size={17} />
          </button>
        </div>
        <Trophy size={150} strokeWidth={1.1} />
      </div>
      <div className="event-missions">
        {[
          {
            id: "event:first-win",
            title: "Chiến thắng đầu tiên",
            desc: "Thắng 1 trận Đấu thường.",
            value: wins,
            target: 1,
            reward: 150,
          },
          {
            id: "event:word-explorer",
            title: "Nhà thám hiểm từ vựng",
            desc: "Hoàn thành tổng cộng 30 từ trong các trận đấu.",
            value: words,
            target: 30,
            reward: 100,
          },
        ].map((m) => (
          <section className="surface mission" key={m.id}>
            <span className="mission-icon">
              <Trophy size={25} />
            </span>
            <div>
              <h3>{m.title}</h3>
              <p>{m.desc}</p>
              <div className="progress-track">
                <span
                  style={{ width: `${Math.min(m.value / m.target, 1) * 100}%` }}
                />
              </div>
              <small>
                {Math.min(m.value, m.target)} / {m.target}
              </small>
            </div>
            <span className="reward-amount">
              <Coins size={19} /> {m.reward} xu
            </span>
            <button
              className={
                claimed.includes(m.id) ? "secondary-button" : "primary-button"
              }
              disabled={
                !account || m.value < m.target || claimed.includes(m.id) || busy
              }
              onClick={() => claim(m.id)}
            >
              {claimed.includes(m.id) ? "Đã nhận" : "Nhận quà"}
            </button>
          </section>
        ))}
      </div>
    </div>
  );
};
