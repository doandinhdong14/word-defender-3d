import React, { useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Crosshair,
  Gift,
  LockKeyhole,
  Play,
  Sparkles,
  Swords,
  Trophy,
} from "lucide-react";
import { useApp } from "../app/appStore";
import { PonpiPreview } from "../components/PonpiPreview";
import { getAssetUrl } from "../utils/assetUrl";

export const HomePage: React.FC = () => {
  const { navigateTo, inventory, profile } = useApp();
  const [modesOpen, setModesOpen] = useState(false);
  if (modesOpen)
    return (
      <div className="portal-page">
        <button className="text-button" onClick={() => setModesOpen(false)}>
          <ArrowLeft size={17} /> Về sảnh
        </button>
        <div className="page-heading">
          <span className="eyebrow">CHỌN CÁCH BẠN TỎA SÁNG</span>
          <h1>Sẵn sàng xuất kích?</h1>
          <p>Một trận đấu mới. Một bước tiến mới.</p>
        </div>
        <div className="mode-grid">
          <button
            className="mode-card available"
            onClick={() => navigateTo("prepare")}
          >
            <span className="tag green">
              <span className="status-dot" /> ĐANG MỞ
            </span>
            <Swords size={56} strokeWidth={1.4} />
            <h2>Đấu thường</h2>
            <p>
              Bảo vệ thế giới bằng sức mạnh từ vựng. Tùy chọn bản đồ và trang bị
              của bạn.
            </p>
            <span className="mode-cta">
              Thiết lập trận đấu <ArrowRight size={20} />
            </span>
          </button>
          {[
            {
              name: "Đấu xếp hạng",
              icon: Trophy,
              desc: "Chinh phục thứ hạng của riêng bạn.",
            },
            {
              name: "Đấu cùng bạn bè",
              icon: Crosshair,
              desc: "Cùng đồng đội tạo nên chiến thắng.",
            },
            {
              name: "Thử thách đặc biệt",
              icon: Sparkles,
              desc: "Những cuộc phiêu lưu đang chờ đón.",
            },
          ].map(({ name, icon: Icon, desc }) => (
            <div className="mode-card locked" key={name}>
              <span className="tag">
                <LockKeyhole size={12} /> SẮP RA MẮT
              </span>
              <Icon size={48} strokeWidth={1.3} />
              <h2>{name}</h2>
              <p>{desc}</p>
              <span className="mode-cta">Sắp ra mắt</span>
            </div>
          ))}
        </div>
      </div>
    );

  return (
    <div className="lobby">
      <div className="lobby-heading">
        <div>
          <span className="eyebrow">MỘT CHÚT HỌC. THẬT NHIỀU VUI.</span>
          <h1>Hôm nay, mình phiêu lưu đâu?</h1>
        </div>
        <span className="lobby-season">
          <span>✳</span> Hành trình từ vựng
        </span>
      </div>
      <section className="lobby-arena">
        <div className="arena-landscape" aria-hidden="true" />
        <div className="arena-grain" aria-hidden="true" />
        <div className="hero-copy">
          <span className="hero-tag">
            <Sparkles size={14} /> CHÀO MỪNG ĐẾN VỚI PEMPOM
          </span>
          <h2>
            Thế giới nhỏ.
            <br />
            Phiêu lưu <em>lớn.</em>
          </h2>
          <p>
            Nạp từ vựng. Chọn chiến binh.
            <br />
            Gõ thật chuẩn và bùng nổ cùng pempom!
          </p>
          <button className="play-cta" onClick={() => setModesOpen(true)}>
            <Play size={24} fill="currentColor" />
            <span>
              CHƠI NGAY<small>Cuộc phiêu lưu bắt đầu từ đây</small>
            </span>
            <ChevronRight size={23} />
          </button>
          <span className="hero-tip">
            <Check size={14} /> Chơi theo cách của bạn, học theo nhịp của bạn.
          </span>
        </div>
        <div className="hero-character">
          <span className="character-bubble">
            Sẵn sàng chưa? <span>✦</span>
          </span>
          <div className="floating-word word-one">
            adventure <small>/ədˈventʃər/</small>
          </div>
          <div className="floating-word word-two">
            <Check size={15} /> let's play!
          </div>
          <div className="character-platform" />
          <PonpiPreview
            width={430}
            height={360}
            scale={2.65}
            styleId={inventory?.equippedStyleId || "style_yellow"}
            outfitId={inventory?.equippedOutfitId}
            frameless
            showPoseSelector={false}
          />
          <span className="character-name">
            <span className="status-dot" /> {profile?.name || "pempom"}{" "}
            <small>NHÀ THÁM HIỂM TỪ VỰNG</small>
          </span>
        </div>
        <button className="arena-gift" onClick={() => navigateTo("gifts")}>
          <span className="gift-drawing">
            <Gift size={43} strokeWidth={1.5} />
          </span>
          <span>
            Quà dành cho bạn<small>Mở một chút bất ngờ!</small>
          </span>
          <ChevronRight size={17} />
          <i />
        </button>
        <span className="arena-coordinate">
          PEMPOM WORLD <span>✦</span> YOUR NEXT ADVENTURE
        </span>
      </section>
      <div className="lobby-bottom">
        <button
          className="lobby-card shop-card"
          onClick={() => navigateTo("store")}
        >
          <span className="card-overline">TRANG BỊ CÁ TÍNH</span>
          <h3>Nhỏ mà có võ.</h3>
          <p>Tướng xịn, đạn chất. Sẵn sàng tỏa sáng.</p>
          <span className="card-link">
            Khám phá Store <ArrowRight size={16} />
          </span>
          <img
            src={getAssetUrl("/assets/samurai/outfit_samurai_icon.png")}
            alt="Trang phục Samurai"
          />
        </button>
        <button
          className="lobby-card lesson-card"
          onClick={() => navigateTo("library")}
        >
          <span className="card-overline">HÀNH TRANG TRI THỨC</span>
          <h3>Từ mới, sức mạnh mới.</h3>
          <p>Chọn bộ từ có sẵn hoặc tải tài liệu của bạn.</p>
          <span className="card-link">
            Vào bài học <ArrowRight size={16} />
          </span>
          <span className="lesson-illustration">
            <BookOpen size={57} strokeWidth={1.35} />
            <i>Aa</i>
          </span>
        </button>
        <button
          className="lobby-card event-card"
          onClick={() => navigateTo("events")}
        >
          <span className="card-overline">THỬ THÁCH TRONG GAME</span>
          <h3>Chơi vui. Rinh quà.</h3>
          <p>Những nhiệm vụ nhỏ, phần thưởng thật vui.</p>
          <span className="card-link">
            Xem sự kiện <ArrowRight size={16} />
          </span>
          <span className="event-illustration">
            <Trophy size={58} strokeWidth={1.4} />
            <Sparkles size={20} />
          </span>
        </button>
      </div>
      <div className="lobby-note">
        <span>
          <span className="status-dot" /> Sẵn sàng cho một trận đấu mới
        </span>
        <span>
          Gõ đúng một từ. Tiến thêm một bước. <ArrowDown size={13} />
        </span>
      </div>
    </div>
  );
};
