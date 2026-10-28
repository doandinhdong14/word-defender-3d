# pempom — IMPLEMENTATION SPECIFICATION

**File:** `spec.md`  
**Version:** 2.0.0 · 2026-10-26  
**Audience:** OpenAI Codex / developer / QA / UI designer  
**Status:** READY TO IMPLEMENT (các giá trị mặc định có thể điều chỉnh trong config)  
**Working title:** pempom (chưa xác minh nhãn hiệu/thương mại)

> **LỆNH DÀNH CHO CODEX:** Đây là **đặc tả sản phẩm và hợp đồng nghiệm thu**, không phải tài liệu brainstorming. Hãy xây dựng **game WEB THẬT, CHƠI ĐƯỢC TỪ ĐẦU ĐẾN CUỐI**, có màn hình, nút hoạt động, gameplay bắn chữ bằng bàn phím, từ vựng, kết quả, dữ liệu lưu, cửa hàng, trang bị, skill và kiểm thử. Không thay đổi yêu cầu `[LOCKED]`. Với chi tiết chưa chốt, dùng mặc định `[DEFAULT]` trong file này, ghi lại ở config và tiếp tục triển khai; **không dừng ở landing page, mockup, form rỗng, nút bấm giả hoặc TODO**. Nếu không có asset hoàn thiện, dùng fallback vẽ tay đơn giản để đảm bảo chạy được, nhưng ưu tiên asset pempom của tác giả khi có. Không cần API AI, backend hay tài khoản để game chạy bản đầu.

---

## 0. Hợp đồng triển khai và mức ưu tiên

### 0.1. Cách đọc

- `[LOCKED]`: người tạo game đã xác nhận; **không tự ý thay đổi**.
- `[DEFAULT]`: quyết định thiết kế/kỹ thuật để Codex có thể triển khai ngay, được điều chỉnh bằng config nếu cần.
- `[MVP]`: phải hoạt động hoàn chỉnh ngay trong bản bàn giao đầu.
- `[NEXT]`: dựng kiến trúc mở rộng, không cần hoàn thiện giao diện/tính năng này ngay.
- `[OUT]`: cố tình loại khỏi phạm vi hiện tại.

**Thứ tự ưu tiên khi có xung đột:** `spec.md` mới này > những ghi chú/design pack cũ > ảnh mô phỏng sinh bởi AI > giả định của lập trình viên. Ảnh minh họa cũ có cây, nhà, hành tinh, sao, núi, trang trí viền... **KHÔNG còn đúng** với yêu cầu nền hiện tại. Ảnh demo quái nhiều loài cùng màn cũng **KHÔNG còn đúng**.

### 0.2. Các điều bất di bất dịch

1. `[LOCKED]` Game học/ôn từ vựng lấy **cơ chế typing-shooter từ ZType**, phối **thẩm mỹ hoài niệm, vẽ tay trên giấy ô ly** (lấy cảm hứng tinh thần Doodle Jump, **không sao chép** code/asset/logo/UI đặc trưng).
2. `[LOCKED]` **Background khu vực chiến đấu chỉ có màu giấy và các đường ô ly đồng đều**. Không có tranh vẽ trang trí, texture họa tiết, cây, mây, sao, hành tinh, nhà, lỗ giấy, núi, đường chân trời, vật thể bối cảnh, animation nền hoặc parallax. Có thể có HUD, nhân vật, quái, tag chữ, đạn, hiệu ứng chiến đấu vì đây là đối tượng gameplay chứ không phải họa tiết nền.
3. `[LOCKED]` **Một trận thông thường chỉ dùng MỘT chủng loại quái thường duy nhất**. Các cá thể được phép khác biểu cảm, kích thước nhỏ hoặc màu sắc rất gần nhau, nhưng giữ cùng silhouette/thiết kế. Boss có thể là biến thể alien riêng, xuất hiện trong wave boss tách biệt; không trộn nhiều giống quái thường cùng lúc.
4. `[LOCKED]` **Mascot chính là sinh vật hồng trong ảnh do tác giả cung cấp**, thân dạng giọt/thạch, đáy lượn sóng, không chân, hai mắt to, tay nhỏ, **miệng dạng nòng súng**. Giữ shape/mặt/tỷ lệ/phong cách gần ảnh gốc; không biến thành nhân vật khác, không làm Among Us.
5. `[LOCKED]` pempom đứng **ở giữa phần dưới màn chơi**, tự quay hướng và bắn theo mục tiêu; đã có **5 pose**: lên-trái, lên, lên-phải, trái, phải. Đạn phải thật sự bay về phía mục tiêu.
6. `[LOCKED]` Có **3 mode học**: chép từ Anh, nhớ từ Anh từ nghĩa Việt, nghe từ rồi gõ. Ghi nhớ dài hạn dựa trên bằng chứng hồi tưởng chứ không đơn thuần đếm số lần gõ.
7. `[LOCKED]` Người dùng có thể chọn **bộ từ sẵn có hoặc tự upload Excel** tạo bộ riêng.
8. `[LOCKED][MVP]` Có **STORE hoàn chỉnh**: kiếm xu qua chơi/học, mua và sở hữu **skill, mũ, áo, style/skin**; vào Wardrobe để trang bị/tháo đồ và nhìn thấy thay đổi trên pempom. Có skill/đạn **làm quái chậm lại** hoạt động thực tế trong game.
9. `[LOCKED]` Thiết kế dễ thương, nét bút đen, giấy ô ly, hoài niệm; **không dashboard SaaS, không 3D bóng bẩy, không neon cyberpunk**.
10. `[MVP]` Tất cả đường đi nút bấm phải hoạt động, không có màn bị khóa do thiếu tài khoản/server; không để white screen hay lỗi JS chặn game.

### 0.3. Mục tiêu bản đầu

Một người mới truy cập URL phải có thể làm liên tục:

`Home -> Word Books -> Chọn bộ / Import Excel -> Chọn mode -> Play -> Bắn quái -> Dùng Slow Shot -> Kết thúc -> Results -> Nhận xu -> Store -> Mua mũ/áo/skill/style -> Wardrobe -> Equip -> Play lại thấy skin + skill hoạt động -> Reload trang vẫn giữ dữ liệu.`

Đây là **happy path bắt buộc** để nghiệm thu; không thể thay bằng screenshot hoặc animation giả.

### 0.4. Phạm vi

**P0 / Bắt buộc vận hành:** các trang Home, Library, Import/Edit Set, Mode/Prepare, Battle, Result, Review, Store, Wardrobe, Progress, Settings; 3 mode; battle loop; quái 1 loài/trận; 1 boss đơn giản; learning history và review; nội dung từ mẫu; Excel/CSV import; coin economy; mua/equip skill + mũ + áo + style; Slow Shot thực sự thay đổi tốc độ quái; data persistence; responsive desktop; test.

**P1 / Nâng chất lượng sau khi P0 đã chạy:** nhiều mẫu quái nhưng **chỉ chọn một loài cho mỗi trận**, thêm boss, nhiều nội dung học, âm thanh nâng cao, nhiều bộ quần áo với asset tinh xảo, hỗ trợ mobile.

**P2 / Sau MVP:** map lựa chọn, world progression, skill tree sâu, daily challenge, leaderboards, multiplayer, đồng bộ tài khoản, cloud, thanh toán thật, app native, PvP, tính năng AI tạo từ.

---

# I. VISION & BRAND

## 1. Core fantasy

> **Một sinh vật thạch màu hồng chiến đấu với những quái vật ngoài hành tinh bằng kiến thức từ vựng. Người chơi nhớ đúng từ thì pempom bắn trúng. Mỗi trận cho thêm điểm, xu và giúp ôn tập. Xu dùng để mua kỹ năng, mũ, áo, style cho pempom.**

Hai vòng tiến triển song song:

- **Learning progression:** new -> learning -> remembered -> review_due -> relearn; dựa trên recall độc lập và ôn lặp.
- **Game progression:** run -> score -> XP/coin -> store -> customize/unlock -> run tiếp.

**Không pay-to-learn:** skin và skill chỉ làm vui hoặc tạo thời gian suy nghĩ, **không được tự động ghi nhận một từ là thuộc**.

## 2. Mascot / nhận diện

- Tên làm việc: **pempom**. Tagline gợi ý: **Learn. Shoot. Remember.**
- Cốt lõi hình dáng: hồng pastel, nét viền đen đậm, highlight mềm; thân tròn hạ thấp như ma nhỏ, đáy lượn sóng; **không chân**; hai tay ngắn; mắt lớn; nòng súng chính là miệng.
- Tính cách: vui, dũng cảm, đáng yêu, hơi ngốc nghếch; không máu me, không vũ khí hiện thực.
- **Silhouette LOCK:** dù đổi skin phải nhìn vẫn ra pempom, không làm mất tay, mắt, nòng súng, hình dáng đáy.
- Thương hiệu có thể mở thành bộ game khác (Listening, Puzzle, Math...), nhưng MVP chỉ triển khai Word Blaster.
- Không lấy nguyên asset, tên/logo hoặc UI độc quyền của Doodle Jump hay ZType; chỉ lấy cảm hứng generic về cơ chế/thẩm mỹ.

## 3. Tài nguyên tham chiếu

Codex kiểm tra trước ở các đường dẫn (nếu chưa có thì game vẫn có fallback):

- `assets/reference/ponpi_5_poses_source.png` — **ảnh gốc do tác giả cung cấp**, gồm 5 tư thế nằm ngang, dùng làm tiêu chuẩn hình dáng tối cao.
- `assets/reference/gameplay_minimal_grid_mockup.png` — mockup mới **nền chỉ ô ly và quái cùng loài**; tham khảo ý tưởng bố cục, không copy pixel-perfect.
- (Nếu có) `assets/ponpi/*.png` — sprites nền trong suốt sau khi người tạo game cung cấp/tách riêng.

**Quan trọng:** ảnh gốc 5 pose có thể là ảnh ghép chứa tia lửa/đạn/nhãn chữ và nền sáng, **không giả định đã là 5 sprite transparent độc lập**. Khuyến nghị normalize/crop từng pose có kiểm tra thị giác; tách bullet VFX riêng. Không dùng nguyên ảnh ghép làm một sprite trong game. Không cắt một cách máy móc để làm biến dạng mặt/màu/pose. Nếu sprite chưa chuẩn, fallback pempom SVG/canvas đơn giản và log cảnh báo; asset pipeline cho phép thay thế không đụng gameplay.

---

# II. ART DIRECTION & DESIGN SYSTEM

## 4. Rule nền tối giản — đặc biệt quan trọng

### 4.1. Battle background

Background chỉ có:

- Base fill `#FBF8F0` (hoặc trắng kem tương đương), **phẳng, không texture**.
- 2 nhóm line (ngang/dọc) đều nhau để tạo ô ly, màu `#C8DDE6`, opacity thấp.
- Line width mặc định **1 px ở tỉ lệ logic**, khoảng cách mặc định **32 px**; scaling responsive không làm mờ nặng.

Cấm tạo: ngôi sao bay, hành tinh, cây, nhà, mây, đồi, rocket trang trí, giấy rách rìa, notebook punch holes, sticker trang trí, confetti nền, hình nền map sinh động. **VFX khi đang đánh trúng quái thì được phép**, là đối tượng gameplay có lifecycle ngắn; không tồn tại cố định trên nền.

Nền menu/Store/Wardrobe cũng theo cùng grid tối giản. Các **card chức năng** (giấy note viền đen, nút) được phép vì là UI, không phải tranh nền.

### 4.2. Style tokens

| Token | Mã tham chiếu | Công dụng |
|---|---|---|
| `paper` | `#FBF8F0` | Base nền |
| `grid` | `#C8DDE6` | Đường ô ly |
| `ink` | `#25232B` | Stroke và chữ chính |
| `mutedInk` | `#6E6A72` | Chữ phụ |
| `ponpiPink` | `#F58AB0` | Màu nhân vật |
| `alienPurple` | `#C69BEC` | Quái mẫu duy nhất trong trận demo |
| `accentYellow` | `#FFD47D` | Score/coin |
| `accentMint` | `#A9DDC3` | Thành công/equipment |
| `danger` | `#EF6E78` | HP thấp/sai |
| `infoBlue` | `#70B9E1` | Freeze/Slow skill |

Tất cả màu đưa vào file tokens; dùng 1–2 font được cấp phép để deploy. **Text từ vựng phải dùng font dễ đọc, không dùng kiểu handwritten khó phân biệt `i`, `l`, `1`**. Hỗ trợ Unicode tiếng Việt đầy đủ.

### 4.3. Visual components

- `StickerButton`: rounded rectangular, viền ink 2–3px, hover nẩy 1–2px; disabled rõ ràng.
- `PaperPanel`: nền kem hơi khác nền, viền đen dày, không trang trí không liên quan.
- `WordTag`: nhãn nổi dưới/quanh quái, đọc rõ trên nền ô ly, mép bo, viền mực.
- `HeartHud`, `ScoreHud`, `WaveHud`, `CoinBadge`: icon vẽ tay, con số rõ.
- `InventoryCard`: thumbnail item, coin price, Owned/Equipped/Locked, nút có hoạt động.
- `TabNav`: Shop tabs Skills / Hats / Shirts / Styles, không đổi route nếu không cần.
- `PonpiPreview`: xem nhân vật + mũ/áo/style, nút đổi 5 pose.
- `Toast`: mua thành công/thất bại, không spam.

### 4.4. Animations

- Bắn đúng ký tự: pose pempom chuyển hướng, muzzle flash 80–120ms, bullet spawn có đường đi.
- Viên đạn: tròn hồng, viền ink, trail ngắn, bay được, 100–250ms tùy khoảng cách.
- Quái trúng: chớp trắng/rung nhẹ, giảm health theo ký tự; hoàn thành từ: pop thành hạt/giấy (0.3s).
- Skill Slow: bullet xanh nhạt hoặc xanh lam riêng biệt, hiệu ứng quái xanh/đường viền xanh + icon bông tuyết/timer; tốc độ thực sự giảm.
- Kết thúc wave: label `WAVE CLEAR` 1s, không khóa input vĩnh viễn.
- Đổi đồ: pempom nhún vui một lần; reduced-motion thì bỏ chuyển động thừa.
- UI transition 100–250ms. Không flash toàn màn/hiệu ứng làm che từ.

### 4.5. Không dùng 3D trong MVP

Game 2D canvas/WebGL với UI HTML; asset minh họa nhiều lớp vẫn có cảm giác hand-drawn, hơi bóng như ảnh gốc pempom. Không cần model 3D hoặc physics engine 3D.

---

# III. USER FLOW & SCREENS

## 5. Sitemap bắt buộc

```text
HOME
 ├─ PLAY / CONTINUE -> LIBRARY -> PREPARE (set + mode + difficulty) -> BATTLE
 │                                                           └─ RESULT -> REVIEW -> PLAY AGAIN / HOME
 ├─ MY WORD BOOKS -> PREVIEW / CREATE / IMPORT / EDIT
 ├─ STORE -> Skills / Hats / Shirts / Styles
 ├─ WARDROBE -> Preview / Equip / Unequip / Set loadout
 ├─ PROGRESS -> History / Due Words / Stats
 └─ SETTINGS -> Audio / Motion / Controls / Data backup
```

Không nút dead-end: nếu chức năng chưa hỗ trợ thì **không hiển thị nút**, hoặc rõ `Coming later` ở khu phụ, không chèn placeholder vào luồng chính.

## 6. Mô tả màn hình và thao tác

### 6.1. HOME `[MVP]`

- Logo `pempom`, nhân vật chính nổi bật ở giữa, nền chỉ ô ly.
- CTA **PLAY** rõ nhất, `Continue` nếu đã chọn bộ từ, `Word Books`, `Store`, `Wardrobe`, `Progress`, `Settings`.
- Widget nhỏ: coins, current level, số từ cần ôn. Không biến thành dashboard bảng/biểu đồ dày đặc.
- Play khi chưa có set -> Library; khi có -> Prepare.

### 6.2. LIBRARY `[MVP]`

- Card mỗi bộ: title, ngôn ngữ nguồn/đích, số từ, tiến độ, origin `Built-in`/`My Set`.
- Seed ít nhất **3 bộ từ tiếng Anh** (Everyday, School, IELTS Basics), mỗi bộ tối thiểu 15–25 bản ghi **có nghĩa chính xác và đáp án rõ ràng**.
- Search/filter; preview; create set; import `.xlsx`/`.csv`; delete/edit bộ tự tạo với confirm; built-in read-only.
- Empty state có nút import/create/built-in; không để trang trắng.

### 6.3. WORD SET EDITOR & IMPORT `[MVP]`

- Flow: upload -> parse local -> detect columns -> map header -> validate -> preview -> import -> success -> chọn set.
- Trường tối thiểu: `english`, `vietnamese`; mở rộng: `partOfSpeech`, `ipa`, `example`, `acceptedAnswers`, `audioUrl` (optional).
- Cho user sửa dòng lỗi/tên bộ trước khi lưu; skip invalid rows có cảnh báo, không crash toàn file.
- Hỗ trợ tối đa mặc định 5MB / 5.000 rows/file để không treo UI; báo ngưỡng rõ.
- Không upload file lên server bản MVP.

### 6.4. PREPARE / MODE SELECT `[MVP]`

- Chọn set, số từ/session (mặc định 15), difficulty (`Easy`, `Normal`, `Hard`), 3 mode.
- Cho người học preview từ mới trước trận; nút `Study First` và `Start Battle`.
- Hiện bộ skill đang trang bị (có nút sang Wardrobe), ô coin; không ép mua.
- Core mode mặc định: **Recall Việt -> Anh**, vẫn giữ 3 mode đều chơi được.

### 6.5. BATTLE `[MVP]`

- Full usable battle viewport; background chỉ ô ly; player dưới giữa, enemy species cố định/trận; nhãn nghĩa/từ; đạn/skill; HUD; pause/restart/quit.
- HUD top: heart, wave, score, coin earned; dưới: target/typed progress và 1–3 skill slots (`1`/`2`/`3`), cooldown/charges.
- Input focus tự hoạt động **không cần click vùng nhập**. Bàn phím được bắt khi màn Battle active; không capture khi pause/modal/Settings.
- Overlay Pause có `Resume`, `Restart`, `Quit` với confirm và phím `Esc`.

### 6.6. RESULTS `[MVP]`

- Score, số đúng/sai, independent recall, hint usage, số từ cần ôn, coin/XP nhận được, status clear/lose.
- Buttons: `Review mistakes`, `Play again`, `Store`, `Home`. `Store` sau trận giúp vòng lặp kiếm xu-mua đồ.
- Khi thua vẫn ghi lại nỗ lực, không đưa trạng thái học sai thành nhớ.

### 6.7. REVIEW `[MVP]`

- Danh sách từ sai, dùng hint, hết thời gian; nghĩa/English/IPA/example nếu có.
- `Practice this word` trong dạng flashcard ngắn, cho nhập lại; không ghi nhận là đã thuộc ngay chỉ vì đọc lại.
- Xem `Due today` và nút `Start review battle`.

### 6.8. STORE `[MVP]`

- Coin balance luôn rõ; tabs `Skills`, `Hats`, `Shirts`, `Styles`; xem trước item; nút `Buy`, `Owned`, `Equip`, `Equipped`.
- Mua trừ coins chính xác một lần, thêm inventory, lưu bền. Không thể coin âm hay mua item hai lần.
- Item thiếu tiền -> nút disabled hoặc thông báo `Not enough coins`; không giao dịch nửa vời.
- Item đã mua có thể Equip ngay từ Store hoặc chuyển Wardrobe.
- Không cóเงินจริง/mua tiền thật/bảng giá fiat trong MVP.

### 6.9. WARDROBE `[MVP]`

- pempom preview lớn trên nền ô ly; 5 pose selector hoặc 5 nút hướng để thử; xem skin real-time.
- Slot: `hat` (0/1), `shirt` (0/1), `style` (0/1), `activeSkills` (tối đa 3 skill khác nhau), `projectileStyle` optional P1.
- Equip item ngay lập tức và lưu; `Unequip` trở lại pempom mặc định.
- Hat và Shirt không được che mắt/nòng súng. Layer phải giữ đúng theo pose.
- Nút `Start Battle`/`Back`, không dead-end.

### 6.10. PROGRESS & SETTINGS `[MVP]`

- Progress: coins, level, streak nếu có, từ mới/đang học/cần ôn/đã nhớ, lịch sử 10 run gần nhất, accuracy độc lập theo mode.
- Settings: audio on/off + volume, reduce motion, font size/readable mode, delete local progress (double confirm), export/import backup JSON.
- Không cần đăng nhập để chơi. Guest local profile auto-created.

---
# IV. GAMEPLAY: INPUT, TARGETING, COMBAT & WAVES

## 7. Logical coordinates / rendering

- `[DEFAULT]` Logical stage `1280 x 720`; responsive letterbox preserving aspect ratio `16:9` for desktop, plus outer background repeating same graph grid. Accept usable viewport from ~960x540 to 1920x1080; scale pixel ratio with devicePixelRatio cap 2.
- Stage: top 70px HUD, bottom 120px input/skill UI; enemies occupy x 80..1200, y 100..565, pempom center x=640, y≈570.
- On resize: recalc layout/scale; maintain target/bullet integrity. Pause simulation when tab hidden, avoid giant delta on resume.
- Drawing order: background -> VFX behind -> enemy -> word tags -> player and wearable layers -> bullets/VFX foreground -> HUD HTML.
- The game is fully keyboard accessible for primary play; pointer click selects enemy and activates abilities in addition to keyboard.

## 8. Three vocabulary gameplay modes `[LOCKED][MVP]`

| ID | Prompt on enemy | Required keyboard answer | Skill assessed | Contribution to learning |
|---|---|---|---|---|
| `copy` | English word, e.g. `improve` | `improve` | Recognition/spelling | Does **not** independently prove meaning recall |
| `recall` | Vietnamese cue `cải thiện` | `improve` | Recall EN from VN | Main signal of durable vocabulary memory |
| `listen` | Speaker icon with spoken EN word, no textual answer | `improve` | Listening + spelling | Updates dictation skill separately; not automatically semantic mastery |

**Mode Listen accessibility:** each enemy has speaker button, auto-plays pronunciation at first spawn when allowed, `R` replays targeted word with per-word throttle; no API key; use browser `speechSynthesis` first, if unavailable fallback to stored audio; if neither works **do not fake** listening mode: show nonblocking notice and allow user switch mode; engine still runs other modes. In Listen mode do NOT reveal English target while typing unless hint explicitly activated. If a device/browser forbids autoplay, show `Click to enable sound` once.

## 9. Enemy type and wave generation

### 9.1. Enemy species coherence `[LOCKED]`

- **Battle/session picks one `enemySpeciesId`** from available definitions, such as `purple_one_eye_alien`.
- All regular mobs in the **entire session** use `enemySpeciesId`. Do not switch visual species between wave 1 and 2. Allowed variants: blink, scared, angry, tiny/big, damage tint; **same eyes/antennae/body contour**.
- Demo uses one-eyed purple alien with 2–3 antenna tips and soft jelly body. Do not mix UFO, orange spiky monster, green blob, bee, robot within one session.
- Boss is unique single large alien in final wave; should look like an evolved version/family of current species, or visually distinguished but does not spawn mixed minion species alongside it.
- Later multiple map themes select **one species per map/run**, not spawn all species on same screen.

### 9.2. Default session config

```ts
const GAME_BALANCE = {
  maxLives: 3,
  wavesPerRun: 3,             // waves 1–2 mobs; wave 3 boss
  regularEnemiesPerWave: [6, 8],
  bossRequiredWords: 5,
  maxConcurrentEnemies: 5,
  sessionWords: 15,
  spawnIntervalMs: 1900,
  baseEnemySpeedPxPerSec: 22,
  speedMultiplierByDifficulty: { easy: 0.70, normal: 1.0, hard: 1.35 },
  targetAcquireRange: 'entire battle field',
  typedBulletSpeedPxPerSec: 1100,
  slowBulletSpeedPxPerSec: 850,
  hitRadiusPx: 24,
  initialCoinBalance: 250,    // onboarding, to test purchase immediately
  startingSkills: ['slow_shot'], // unlocked + equipped for demo
} as const;
```

These are **tunable defaults**, not scientific values. Balance must be central config and not duplicated in components.

- Spawn positions avoid overlap of WordTags and HUD. Minimum separation x 180px; retries and delayed spawn if no valid slot.
- Target reaches defensive line near pempom -> lose one heart, mob removed, word logged as timeout/missed, brief invulnerability 0.7s to prevent burst damage.
- When all mobs killed or escaped and pending queue empty -> `WAVE_CLEAR` -> next wave. Avoid soft lock if all enemies removed/timeout.
- Final boss requires completing 5 individual word prompts; boss must never display five simultaneous ambiguous labels.
- **15 từ/session = khoảng 15 từ phân biệt**, không phải giới hạn số enemy; wave 1–2 (14 mob) + boss 5 prompt (19 lần hỏi) có thể lặp một số từ đến hạn/khó nhưng không lặp ngay liền nhau.
- Max session duration soft target 3–5 minutes on normal, **not a hard timeout** that discards progress.

## 10. Target acquisition and keyboard semantics

This is a difficult requirement; **implement deterministic behavior** and write tests.

### 10.1. One active target

- `selectedEnemyId: string | null`, `typedBuffer: string`, `candidateAnswers: string[]` belong to battle state; **only one active target at a time**.
- If no target and user types first printable character, compute eligible enemies whose any accepted English answer begins with that normalized letter; select **closest to defensive line** (largest y), ties `spawnedAt` then `id`. Lock enemy.
- Player may **click directly on an enemy/WordTag** before typing to select it even if initials collide; selected label gets thick outline/pink target marker.
- `Tab` cycles across living enemies in deterministic y/x order (prevent default browser focus **only while game active**). `Escape` clears typedBuffer/target when Battle playing; if none selected, opens Pause. `Backspace` removes last typed char but **does not refund already fired bullets/score**; target remains until cleared/canceled.
- When target destroyed/escaped, clear lock and buffer. If target escapes during typing, record miss and show small `Target escaped` toast (do not leave lock stale).

### 10.2. Typed progress and wrong keys

- `keydown` letters `[a-z]` case-insensitive; optional space/hyphen/apostrophe allowed only when present in candidate answer; ignore modifiers, IME composition, repeated key while held down (`event.repeat`), Ctrl/Alt/Meta combos. Prevent browser scrolling on Space when in battle.
- Unicode normalize English: trim, casefold, collapse whitespace, optional apostrophes/hyphens based on expected answer. **No transliteration guessing for proper nouns**, don't silently drop significant accents in source data.
- A valid next char extends `typedBuffer`, fires one **normal pink bullet** visually toward selected enemy; word progress shown as partially typed (`impr•••`) and a small progress bar; no English leaks in recall/listen before user types.
- Wrong char: buffer does not advance, **no shot**, play soft feedback, reset combo on first wrong per word, add `wrongKeystrokes += 1`. Rate-limit sound/flash. Continue playing; no instant life damage for keyboard mistake.
- Completed match against an accepted answer -> `WORD_SUCCESS`, pop monster **only after successful completion**; award points, stats, coins (at end of run), log answer quality; clear buffer/lock and move to next target.
- If accepted aliases have different spellings: evaluate typed prefix against candidateAnswer set; on target lock maintain prefix trie. When prefix matches none: wrong key; if prefix equals any full accepted answer, complete. If ambiguity exists due to one answer prefix of another, shorter full answer wins on completion.
- Do not auto-choose English word as target merely because the user presses arbitrary keys; if none matches, show discreet `No matching target` and do not create ghost bullet.
- For mode copy, target is visible; for mode recall/listen, display `typed buffer + placeholders` not hidden true letters; show **only length** until recalled. If selected target by click, show cue/meaning, not hidden answer.
- Physical keyboard Vietnamese input method: treat `event.isComposing` carefully; English answers typed with unaccented Latin keys; document if active Vietnamese IME may interfere; offer visible input capture/focus support without causing form field distraction.

### 10.3. Examples / QA scenarios

1. `improve` and `imagine` appear together, type `i`: lock closest to bottom; `Tab` before typing can deliberately select other; click other to pick explicitly.
2. Selected `improve`, type `imprz`: buffer stays `impr`; invalid `z` causes soft feedback; then `ove` completes.
3. Enemy dies/escapes while 4 letters typed -> clear lock and buffer, no endless pending bullet.
4. Nhãn tiếng Việt dài phải wrap, không chồng nhãn khác; đáp án nhiều tiếng như `look after` hỗ trợ Space.
5. Giữ phím không tự bắn liên tục (bỏ `event.repeat`).
6. Pause/quit không để gõ ảnh hưởng menu hoặc game nền.

## 11. Đạn, tư thế bắn, va chạm

### 11.1. Pose mapping

Dùng vector từ `muzzle` tới tâm mục tiêu và góc, ánh xạ vào một trong năm pose:

| Pose | Hướng | Asset |
|---|---|---|
| `fire_left` | Trái ngang | `ponpi_fire_left.png` |
| `fire_up_left` | Trái chéo | `ponpi_fire_up_left.png` |
| `fire_up` | Thẳng trên | `ponpi_fire_up.png` |
| `fire_up_right` | Phải chéo | `ponpi_fire_up_right.png` |
| `fire_right` | Phải ngang | `ponpi_fire_right.png` |

Không có target: `idle` riêng nếu có, nếu không thì neutral pose được xử lý sạch đạn tĩnh. Pose chuyển đổi không làm nhân vật giật vị trí/scale.

### 11.2. Bullet / combat source of truth

- Mỗi phím đúng tạo một viên đạn **thực sự chuyển động** (`id`,`source`,`targetId`,`velocity`,`effect`,`ttl`). Hiển thị đường bay đến đúng enemy đã khóa, không bắn xuyên làm chết nhầm quái khác.
- Thành công/chấm từ xảy ra khi **hoàn thành đáp án**, không phụ thuộc collision đồ họa hay FPS; viên đạn là hoạt ảnh xác nhận từng ký tự.
- Skill bullet màu khác normal bullet; ảnh gốc pempom có hiệu ứng bắn không được giữ đạn đứng yên thay cho entity đạn.
- Asset rig có anchor `muzzle`, `hatAnchor`, `shirtAnchor` cho từng pose; sử dụng cùng rig trong Battle và Wardrobe.

### 11.3. Events bắt buộc

`RUN_START`, `WAVE_START`, `ENEMY_SPAWN`, `TARGET_SELECTED`, `LETTER_CORRECT`, `LETTER_WRONG`, `BULLET_FIRED`, `WORD_COMPLETED`, `ENEMY_ESCAPED`, `PLAYER_HURT`, `SKILL_ACTIVATED`, `SKILL_HIT`, `WAVE_CLEAR`, `BOSS_START`, `BOSS_HIT`, `RUN_WIN`, `RUN_LOSE`, `PAUSE`, `RESUME`, `QUIT`.

Render không được tự ý cấp coin hoặc thay trạng thái học; update qua reducer/engine event.

## 12. HP / điểm / combo / tạm dừng

- Bắt đầu 3 trái tim. Quái tới ranh phòng thủ -> mất 1 tim, remove mob, từ đó tính Missed; invulnerability ngắn 700ms tránh mất 3 máu cùng frame.
- Điểm mặc định: từ đúng `100 + length*5` và `+ min(combo,10)*10`; độ khó chỉ tăng điểm, không tăng mastery.
- Combo tăng mỗi từ hoàn tất không sai và không dùng hint; reset khi sai, dùng hint hoặc để quái thoát. Dùng slow/freeze/shield không làm mất combo nếu vẫn tự trả lời.
- `Esc` khi đang có target thì bỏ khóa. `Esc` khi không target mở Pause; trong Pause `Esc` Resume. Cooldown, enemy, bullets, boss timer dừng hoàn toàn.
- Refresh/chuyển tab: không double award; tab ẩn tự pause. Checkpoint ở đầu wave và lúc pause; có Resume/discard hoặc ít nhất persist an toàn run/session.

## 13. Boss `[MVP]`

- Wave 3 có **một alien boss lớn** cùng họ thiết kế với quái thường; không spawn loài quái khác đồng thời.
- 5 ô máu; mỗi ô phải hoàn thành **một prompt từ vựng**. Hiện chỉ một nhãn thử thách tại một thời điểm.
- Sau một từ đúng: boss co giật/flash, trừ 1 HP, cue mới xuất hiện. Câu sai không tự động mở đáp án.
- Boss từ từ tiến tới phòng thủ; tới nơi có thể kết thúc trận. Ưu tiên từ đến hạn/từ yếu, tránh lặp hai câu giống hệt liền nhau.
- Boss là bài kiểm tra kiến thức, **không được giết bằng skill mà chưa gõ từ**.

---

# V. STORE, SKILLS, WARDROBE & ECONOMY

## 14. Hệ thống Store `[LOCKED][MVP]`

Có **4 tab thật sự hoạt động**: `SKILLS`, `HATS`, `SHIRTS`, `STYLES`. Mua bằng **xu kiếm trong game**, sở hữu vĩnh viễn trong profile local; không thanh toán tiền thật. Thấy số dư xu, giá, nút mua, nhãn Owned/Equipped, xem trước trước khi mua.

- Một lần mua: kiểm tra chưa sở hữu + đủ xu -> trừ xu -> thêm sở hữu -> ghi ledger -> persist **nguyên tử**; double click không nhân đôi, xu không âm.
- Preview món chưa sở hữu chỉ là thử trước, không được save như equipped.
- Nếu thiếu tiền -> thông báo rõ; không làm gì sai lệch.
- New profile được `[DEFAULT]` 250 coins **onboarding once** để thử cửa hàng; không cộng lại sau reload.
- Skill equip ở Wardrobe hoặc ngay Store. Bản đầu tối đa 3 skill active (hotkeys `1/2/3`).

## 15. Skill gameplay: phải có hiệu lực thực tế

### 15.1. Slow Shot — đạn làm chậm `[LOCKED][MVP]`

**Ý tưởng:** pempom bắn viên đạn xanh băng vào một quái. **Quái bị trúng sẽ di chuyển chậm lại thực sự**, không chỉ đổi màu.

| Thông số | Mặc định |
|---|---|
| ID | `skill_slow_shot` |
| Mở khóa | Miễn phí, Owned + Equipped khi tạo profile |
| Kích hoạt | Key `1` nếu ở slot đầu, hoặc click icon |
| Số lần mỗi run | 3 |
| Cooldown | 12s |
| Đạn | Màu xanh nhạt, tốc độ 850px/s |
| Địch bị ảnh hưởng | Selected enemy nếu còn sống; nếu không thì quái có y lớn nhất |
| Hiệu lực | Quái chỉ còn **35% tốc độ gốc** trong 5s |
| Hại lên từ | Không giảm chữ, không tự tiêu diệt, không tăng mastery |

**State transition:**

1. Dùng key/click khi PLAYING, còn charge, cooldown sẵn sàng. Nếu chưa có mục tiêu sống -> không mất charge.
2. Trừ 1 charge, bắt đầu cooldown, tạo **slow projectile** từ nòng pempom tới mục tiêu.
3. Projectile chạm enemy -> ghi status `{kind:'slow', multiplier:0.35, expiresAtGameMs:now+5000}`; hiện tint/viền xanh và timer nhỏ.
4. Trong tick vận động, `enemy.velocityY = baseSpeed * activeSpeedMultiplier`. **Đúng số 35%**, có thể đo bằng test.
5. Hết hạn -> trở lại tốc độ bình thường; nếu bắn tiếp khi đang slow -> **refresh time**, không nhân multiplier nhiều lần.
6. Nếu địch chết trước lúc đạn skill chạm, projectile despawn an toàn, charge đã dùng không hoàn lại.
7. Khi pause game, projectile/cooldown/status đều dừng theo `gameClock`, không theo `Date.now()`.

**Bắt buộc QA:** so sánh `deltaY` trong cùng một khoảng thời gian trước và sau slow, tỷ lệ kỳ vọng gần 0.35 (±10%); **cấm làm skill visual-only**.

### 15.2. Freeze Pulse `[MVP]`

- ID `skill_freeze_pulse`, giá 200 xu, tối đa 2 lần/run, cooldown 25s.
- Khi kích hoạt, **tất cả quái thường đang có trên màn** giảm còn 15% tốc độ trong 3s; boss giới hạn giảm còn 45% để không quá dễ.
- Nếu Slow Shot cùng lúc, dùng `min(slowMultiplier, freezeMultiplier)`, **không nhân chồng**; sau freeze hết hạn vẫn còn slow riêng nếu thời gian slow chưa kết thúc.
- Không tự kill quái/không tính đúng từ.

### 15.3. Shield Bubble `[MVP]`

- ID `skill_shield_bubble`, giá 150 xu, tối đa 2 lần/run, cooldown 30s.
- Kích hoạt tạo một lớp khiên tối đa 12s; chặn **lần chạm phòng thủ tiếp theo** rồi mất.
- Quái tới đáy vẫn bị xóa, từ bị ghi `missed`. Chỉ HP được bảo vệ, không xóa kết quả học sai.
- Hiện vòng khiên rõ quanh pempom; không che mắt/nòng súng/chữ.

### 15.4. Quy luật trang bị và thời gian

- Tối đa 3 skill trang bị, không trùng ID; `1/2/3` theo **thứ tự loadout**, không cứng theo tên skill.
- Charges và cooldown reset **khi bắt đầu run mới**, không reset mỗi wave. Mua skill mở quyền dùng mọi run sau.
- Không cho kích hoạt liên tục khi hết charge/cooldown; UI thể hiện trạng thái disabled và nguyên nhân.
- Skill không thay cho gõ từ; **mọi quái thường vẫn cần hoàn thành đáp án để bị tiêu diệt**.

## 16. Hat, Shirt, Style và rig trang phục

### 16.1. Seed catalog `[MVP]`

Có **tối thiểu 3 món mũ, 3 áo, 3 style trả xu và 2 skill trả xu**. Cấu hình mặc định:

| ID | Loại | Tên | Xu | Hình/effect |
|---|---|---|---:|---|
| `skill_slow_shot` | skill | Slow Shot | 0 | Blue slow bullet, starter |
| `skill_freeze_pulse` | skill | Freeze Pulse | 200 | Area slowdown |
| `skill_shield_bubble` | skill | Shield Bubble | 150 | Chặn 1 va chạm |
| `hat_cap` | hat | Scribble Cap | 80 | Mũ lưỡi trai nét bút |
| `hat_wizard` | hat | Magic Hat | 140 | Mũ phù thủy |
| `hat_crown` | hat | Paper Crown | 250 | Vương miện giấy |
| `shirt_hoodie` | shirt | Cozy Hoodie | 100 | Áo hoodie đơn giản |
| `shirt_sailor` | shirt | Sailor Shirt | 150 | Cổ áo thủy thủ |
| `shirt_star` | shirt | Star Tee | 180 | Hình sao chỉ **trên áo**, không ở nền |
| `style_classic` | style | Classic Pink | 0 | pempom màu hồng, starter |
| `style_mint` | style | Mint Jelly | 180 | Đổi màu thân mint |
| `style_lavender` | style | Lavender Jelly | 200 | Thân tím nhạt |
| `style_sunny` | style | Sunny Peach | 220 | Thân đào |

Mỗi món cosmetic phải có asset/shape nhìn thấy rõ ở Wardrobe **và Battle**, không chỉ đổi text nhãn. Màu alternate phải giữ khuôn mặt/nòng súng/viền đen/hình dáng gốc.

### 16.2. Wardrobe rig / layer cho 5 pose

pempom có 5 hướng nhắm nên mũ/áo phải căn theo **từng pose**, không đặt CSS `top:-20px` cố định cho mọi hướng.

```ts
type PoseId = 'idle'|'fire_up_left'|'fire_up'|'fire_up_right'|'fire_left'|'fire_right';
type Point = { x: number; y: number };
type PonpiRig = Record<PoseId, {
  hatAnchor: Point; shirtAnchor: Point; muzzleAnchor: Point;
  hatRotationDeg: number; shirtRotationDeg?: number;
}>;
```

- `ponpiRig.ts` lưu anchor **normalized 0..1 trong sprite body**, có offset/rotation theo từng pose.
- Lớp: **body recolor** -> **shirt** -> **mặt/tay/nòng súng** (nếu asset có layer) -> **hat** -> **muzzle VFX**. Mũ/áo **không che mắt/nòng**.
- Không tô tint lên cả PNG nếu làm đổi màu mắt/viền; dùng recolor mask/asset set hoặc fallback vector có các phần tách biệt.
- `PonpiRenderer` **dùng chung** cho Wardrobe preview và Battle để trang phục không lệch khi vào trận.
- Cosmetic chỉ đổi ngoại hình, **không cộng speed/damage/accuracy** trong MVP.

### 16.3. Tương tác

- Preview món chưa mua: có overlay `Preview only`.
- Mua xong -> `Owned`; bấm Equip -> trang bị ngay, persist; `Unequip` cho hat/shirt. Style luôn có đúng một lựa chọn, mặc định Classic.
- Wardrobe có 5 nút pose; chuyển pose thấy mũ/áo đi theo pempom. Khi quay lại Battle vẫn đúng.
- Thực hiện giao diện `Shop -> Buy hat -> Wardrobe -> Equip -> Battle` được **không cần reload**.

## 17. Xu, XP, phần thưởng

- **Không dùng tiền thật** ở MVP. Người chơi kiếm xu bằng chiến đấu và học.
- Onboarding 250 xu chỉ **một lần/profile**. Tính phần thưởng trên run completed/failed có tiến triển thực:

```ts
function calculateRunCoins(s: RunSummary): number {
  const completed = Math.max(0, s.completedWords);
  if (completed === 0 && s.wavesCleared === 0) return 0;
  return 10
    + Math.min(60, s.independentRecallCorrect * 4)
    + Math.min(40, completed * 2)
    + s.wavesCleared * 5
    + (s.result === 'win' ? 25 : 0);
}
```

- Award **once per `runId`**, lưu ledger `earn-run-<runId>`; re-open Results/refresh không cấp tiền lại.
- Purchase `purchase-<itemId>` permanent, tránh double click/race. Không mua trùng. Coins không âm.
- XP per correct completed word default 10; level formula đơn giản (100 XP mỗi level hoặc configurable), không gate bộ từ bởi level.
- Dùng skill **không mất xu mỗi lần bắn**; charges refill run sau. Nhắm giá để 1–3 run là đủ mua món đầu tiên, không grind quá lâu.

---

# VI. VOCABULARY DATA & LEARNING SCIENCE

## 18. Source of vocabulary `[LOCKED]`

- Built-in sets: ít nhất 3 bộ sẵn (`Everyday`, `School`, `IELTS Basics`), mỗi bộ 15–25 từ hợp lệ; bộ sẵn bất biến nhưng có thể copy thành set cá nhân.
- User-generated sets: nhập từng từ trong UI hoặc import `.xlsx`/`.csv`, lưu vào IndexedDB; user edit/delete/duplicate.
- Hệ thống là **English answer từ Vietnamese prompt** cho recall; mở tương lai ngôn ngữ khác nhưng không phải làm ngay.
- Từ vựng có thể là cụm từ, ví dụ `take care of`, `look after`; **không giới hạn một token**.

### 18.1. Data format

```ts
type VocabularyEntry = {
  id: string;
  setId: string;
  english: string;              // required; primary answer
  vietnamese: string;           // required; recall prompt
  acceptedAnswers: string[];    // optional accepted English aliases
  partOfSpeech?: string;
  ipa?: string;
  exampleEn?: string;
  exampleVi?: string;
  difficulty?: 1|2|3|4|5;
  audioUrl?: string;            // optional, no API dependence
  tags?: string[];
  createdAt: string;
  updatedAt: string;
};

type VocabularySet = {
  id: string;
  title: string;
  description?: string;
  owner: 'builtin'|'local';
  entryIds: string[];
  createdAt: string;
  updatedAt: string;
};
```

### 18.2. Validate/import Excel

- `.xlsx` qua thư viện parser chạy local; `.csv` qua CSV parser hỗ trợ UTF-8 và BOM. **Không execute macro, HTML, công thức hay JavaScript từ file**.
- Header alias `english`, `word`, `en`, `từ`, `vietnamese`, `meaning`, `nghĩa`, `vi` và cho user map nếu không nhận ra.
- Trim whitespace, normalize Unicode NFC, preserve dấu Việt. Validate required cả hai trường, length min 1, max đề xuất English 120 / meaning 300.
- Duplicate `(englishNormalized, vietnameseNormalized)` trong set -> flag duplicate; chọn skip/merge sau preview; **không lặng lẽ xóa dữ liệu**.
- Rows có công thức -> đọc cached evaluated value nếu thư viện support, không eval, nếu không báo unsupported.
- File >5MB hoặc >5000 hàng -> thông báo giới hạn, không treo tab; file rỗng/bad xlsx báo lỗi cụ thể.
- User thấy `import summary`: total, valid, skipped, duplicates, error rows; sửa được item sau import.
- Download file CSV template. Một bộ phải có ít nhất 5 entries hợp lệ để start combat mặc định; nếu <5 thì cho Practice thử hoặc yêu cầu thêm từ, không crash.

## 19. Học từ và đánh giá thực

### 19.1. Nguyên tắc

**Một phát bắn đúng không có nghĩa một từ đã thuộc.** Hệ thống phân biệt **performance** (điểm chơi) và **memory evidence** (độ nhớ từ).

- Mode `copy` -> spelling practice, không tăng mastery về nghĩa như recall độc lập.
- Mode `recall` -> nếu đúng **không hint, không lộ đáp án**, là `independentRecallCorrect=true` và có thể tăng memory stage.
- Mode `listen` -> ghi dictation/listening mastery riêng; không mặc định tăng semantic recall.
- Wrong key / dùng hint / timeout -> đưa từ vào ôn lại sớm. Slow Shot/Shield/Freeze **không phải hint**, không tự hạ chất lượng hồi tưởng nếu đáp án vẫn tự nhớ.
- Phần thưởng gắn với học nhưng không phạt người học tới mức bỏ cuộc; display từ khó và câu trả lời sau trận.

### 19.2. MemoryState

```ts
type MemoryStage = 'new' | 'learning' | 'remembered' | 'due' | 'struggling';
type LearningRecord = {
  entryId: string;
  stage: MemoryStage;
  independentRecallStreak: number;
  easeLevel: number;             // 0..5, logic đơn giản
  successfulRecalls: number;
  failedRecalls: number;
  lastReviewedAt?: string;
  nextDueAt?: string;
  separateCopyAccuracy?: number;
  separateListeningAccuracy?: number;
};

type Attempt = {
  id: string;
  runId: string;
  entryId: string;
  mode: 'copy'|'recall'|'listen';
  outcome: 'correct'|'wrong'|'timeout'|'abandoned';
  typedAnswer: string;
  acceptedAnswer?: string;
  hadHint: boolean;
  wrongKeystrokes: number;
  timeToAnswerMs: number;
  slowSkillUsedOnEnemy?: boolean;
  occurredAt: string;
};
```

**Ghi đúng một Attempt cho mỗi enemy vocabulary challenge**, nếu boss có nhiều segments thì mỗi segment một Attempt. Bất kỳ lần quit/refresh phải có quy tắc `abandoned`, tránh data half-written.

### 19.3. Spaced repetition default

Dùng scheduler minh bạch, **không tuyên bố đây là SM-2/FSRS nếu không implement đúng**.

| Kết quả | Update đề xuất |
|---|---|
| Recall đúng độc lập lần đầu | `learning`, due sau 1 ngày |
| Recall đúng độc lập lần hai (ở lượt đến hạn) | `remembered`, due sau 3 ngày |
| Recall đúng ở các lần sau | due 7 -> 14 -> 30 -> 60 ngày (có cap tùy config) |
| Recall sai / timeout / bấm Hint | `struggling`, due sau 10 phút; giảm streak về 0 |
| Mode Copy đúng | update copy skill, không nhảy `remembered` |
| Mode Listen đúng | update listening skill, vẫn không tự xác nhận recall nghĩa |

- Due date dùng timestamp ISO UTC + hiển thị theo timezone thiết bị; không phân biệt chỉ bằng text của từ, dùng **ID của entry**.
- Với `review_due` và `struggling`, tăng xác suất đưa vào trận ôn; giai đoạn mới thì hỗn hợp giữa due/weak/new.
- Ví dụ session 15 words: 7 từ đến hạn, 4 từ yếu, 4 từ mới nếu đủ pool; nếu không đủ thì fill từ đang học, cho lặp hạn chế nhưng tránh cùng từ 2 lần sát nhau.
- Nếu người chơi chỉ có 5 từ, vẫn chạy; lesson pool cycling có `cooldownQuestions` để tránh lặp liền nếu có thể.
- History nên mô tả rõ bằng nhãn `Chưa học`, `Đang học`, `Đã nhớ`, `Cần ôn`, `Hay sai`.

### 19.4. Hint system

- `H` hoặc click `Gợi ý`: với target đang chọn, reveal **một chữ cái kế tiếp** hoặc hint part-of-speech; mode listen có thể cho nghe lại không xem là hint, nhưng việc hiện chữ cái là hint.
- Hint không auto-fire hoặc auto-complete; skill Slow Shot **không phải hint**.
- Ghi `hadHint=true` và không tăng independent recall streak, dù cuối cùng gõ đúng. Có thể vẫn được 50% score tùy config.
- Không làm lộ toàn bộ answer trong recall/listen trước khi thất bại; after-results mới show full.

### 19.5. Statistics / reports

Trên Results/Progress thể hiện tách biệt:

- `wordsSeen`, `completedWords`, `independentRecallCorrect`, `copyCorrect`, `listeningCorrect`, `hintsUsed`, `timeouts`, `typingAccuracy`.
- `newCount`, `learningCount`, `rememberedCount`, `dueCount`, `strugglingCount`.
- Coin và game score được tính riêng khỏi mastery.

---

# VII. TECHNICAL ARCHITECTURE — IMPLEMENTABLE DEFAULTS

## 20. Stack chốt mặc định cho Codex `[DEFAULT]`

Mục tiêu ưu tiên **dễ chạy, dễ debug, không đòi backend, có game loop thật**.

| Layer | Default choice | Reason |
|---|---|---|
| Build/Web | Vite + React + TypeScript (strict) | Client app dễ triển khai |
| Game runtime | Phaser 3, module game scene riêng | 2D canvas/WebGL, timing, input, entities |
| UI Shell | React + CSS variables, CSS modules hoặc scoped CSS | Screen/menu/store rõ ràng |
| State/app | Zustand hoặc React Context + reducers | UI & inventory |
| Persistence | IndexedDB bằng Dexie (có migrations) | Sets, attempts, runs, economy, inventory |
| CSV | Papa Parse hoặc CSV parser tương đương | UTF-8 + quoted field support |
| XLSX | ExcelJS browser-compatible hoặc parser tương đương | Đọc local file; tránh exec macro |
| Tests | Vitest + React Testing Library + Playwright | Unit/component/E2E |
| Audio | Browser Web Audio / HTMLAudio / speechSynthesis | Không API key |

Nếu repo đã có stack tương đương đang chạy tốt thì **không ép rewrite**. Tuy nhiên cần dùng **một game loop thực**. Không viết toàn bộ gameplay bằng DOM elements `setInterval` rời rạc. Không buộc Firebase/Auth để click Play. Không dùng API trả phí trong MVP.

### 20.1. Deployment

- `npm install`, `npm run dev`, `npm run build`, `npm run preview`, `npm run test` phải hoạt động.
- `npm run test:e2e` chạy nếu Playwright browser đã được cài. Bổ sung hướng dẫn `npx playwright install chromium`.
- Static hosting (Netlify/Vercel/Firebase Hosting) có thể chạy build `dist/`, SPA routing fallback nếu dùng routes.
- No required environment variables for play. Nếu có Firebase optional, tắt bằng feature flag.
- Không chèn bí mật/API key trong client. Không phụ thuộc service ngoài khi offline sau khi page load (ngoại trừ voice synth theo hỗ trợ trình duyệt).

## 21. Modules và thư mục đề xuất

```text
ponpi-word-blaster/
├── spec.md
├── README.md
├── package.json
├── public/
│   └── assets/
│       ├── reference/                     # nguồn ảnh, không render nguyên sheet
│       │   ├── ponpi_5_poses_source.png
│       │   └── gameplay_minimal_grid_mockup.png
│       ├── ponpi/                         # sprite transparent, optional when supplied
│       │   ├── idle.png
│       │   ├── fire_up_left.png
│       │   ├── fire_up.png
│       │   ├── fire_up_right.png
│       │   ├── fire_left.png
│       │   └── fire_right.png
│       └── audio/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── styles/
│   │   ├── tokens.css
│   │   ├── notebook-grid.css             # chỉ ô ly
│   │   └── global.css
│   ├── config/
│   │   ├── balance.ts
│   │   ├── catalog.ts
│   │   └── featureFlags.ts
│   ├── app/
│   │   ├── router.tsx
│   │   ├── appStore.ts
│   │   └── useGameBridge.ts
│   ├── components/
│   │   ├── StickerButton.tsx
│   │   ├── PaperPanel.tsx
│   │   ├── CoinBadge.tsx
│   │   ├── PonpiPreview.tsx
│   │   └── WordTag.tsx
│   ├── pages/
│   │   ├── HomePage.tsx
│   │   ├── LibraryPage.tsx
│   │   ├── WordSetEditorPage.tsx
│   │   ├── PreparePage.tsx
│   │   ├── BattlePage.tsx
│   │   ├── ResultsPage.tsx
│   │   ├── ReviewPage.tsx
│   │   ├── StorePage.tsx
│   │   ├── WardrobePage.tsx
│   │   ├── ProgressPage.tsx
│   │   └── SettingsPage.tsx
│   ├── game/
│   │   ├── PhaserGame.ts
│   │   ├── scenes/BattleScene.ts
│   │   ├── engine/gameMachine.ts
│   │   ├── engine/gameReducer.ts
│   │   ├── engine/targeting.ts
│   │   ├── engine/typing.ts
│   │   ├── engine/spawning.ts
│   │   ├── engine/projectiles.ts
│   │   ├── engine/skills.ts
│   │   ├── engine/statusEffects.ts
│   │   ├── entities/Enemy.ts
│   │   ├── entities/Boss.ts
│   │   ├── entities/pempom.ts
│   │   ├── assets/ponpiRig.ts
│   │   ├── assets/PonpiRenderer.ts
│   │   └── themes/gridTheme.ts
│   ├── learning/
│   │   ├── scheduler.ts
│   │   ├── sessionSelector.ts
│   │   ├── attempts.ts
│   │   └── pronunciation.ts
│   ├── economy/
│   │   ├── catalog.ts
│   │   ├── inventory.ts
│   │   ├── ledger.ts
│   │   ├── rewards.ts
│   │   └── loadout.ts
│   ├── data/
│   │   ├── db.ts
│   │   ├── migrations.ts
│   │   ├── localProfile.ts
│   │   ├── importExcel.ts
│   │   ├── seedWordSets.ts
│   │   └── backup.ts
│   ├── types/
│   │   ├── game.ts
│   │   ├── vocabulary.ts
│   │   ├── learning.ts
│   │   └── economy.ts
│   └── tests/
│       ├── unit/
│       ├── integration/
│       └── e2e/
└── playwright.config.ts
```

Điều chỉnh structure hợp lý tùy repo; mục tiêu là **separation of concerns**: canvas render vs logic game vs learning vs economy vs storage.

## 22. Application / game finite state machine

`BOOT -> HOME -> LIBRARY -> PREPARE -> COUNTDOWN -> WAVE_PLAYING -> WAVE_CLEAR -> (WAVE_PLAYING | BOSS_PLAYING) -> RUN_RESULT -> HOME`.

Các state tạm: `PAUSED`, `GAME_OVER`, `ASSET_ERROR_FALLBACK`. UI Store/Wardrobe/Progress hoạt động từ Home hoặc sau Result, **không có gameplay sau modal**.

- State transitions explicit; return cleanup handles/event listeners on unmount. Không mount Phaser scene hai lần chỉ vì React StrictMode.
- Physics uses `deltaMs` from Phaser main game clock; clamp delta e.g. 32–50ms, slow/freeze/cooldowns use **same simulation clock**, not nhiều setTimeout.
- React -> Phaser: commands `START_RUN`, `PAUSE`, `RESUME`, `ACTIVATE_SKILL`, `SELECT_TARGET`, `CHANGE_EQUIPMENT`.
- Phaser -> React: read-only events/snapshots `BATTLE_HUD_UPDATED`, `RUN_FINISHED`, `ERROR`, `ATTEMPT_FINISHED`.
- Game reducer/logic pure where practical, so testing không cần render canvas.

## 23. Entity models / persistence schema

```ts
type StoreCategory = 'skill'|'hat'|'shirt'|'style';
type StoreItem = {
  id: string; category: StoreCategory;
  title: string; description: string;
  priceCoins: number; previewKey: string;
  effectId?: string;
};

type Inventory = {
  profileId: string;
  ownedItemIds: string[];
  equippedHatId: string|null;
  equippedShirtId: string|null;
  equippedStyleId: string;          // classic by default
  equippedSkillIds: string[];       // 0..3, owned, unique
};

type Wallet = { profileId: string; balance: number; totalEarned: number; totalSpent: number };
type LedgerEntry = { id: string; profileId: string; kind:'earn'|'spend'|'onboarding'; amount: number; referenceId: string; at: string };

type EnemyState = {
  id: string; speciesId: string; entryId: string;
  x: number; y: number; baseVelocityY: number;
  statusEffects: { slowUntilGameMs?: number; freezeUntilGameMs?: number };
  selected: boolean; spawnedAtGameMs: number;
};

type SkillRuntime = {
  itemId: string; remainingCharges: number;
  readyAtGameMs: number;
};

type RunSummary = {
  id: string; setId: string; mode: 'copy'|'recall'|'listen';
  difficulty: 'easy'|'normal'|'hard';
  result: 'win'|'lose'|'quit';
  completedWords: number; independentRecallCorrect: number;
  wavesCleared: number; totalScore: number;
  attemptedEntryIds: string[];
  startedAt: string; endedAt: string;
  rewardedAt?: string;
};
```

IndexedDB tables at minimum: `profiles`, `wordSets`, `words`, `learningRecords`, `attempts`, `runs`, `wallets`, `ledger`, `inventories`, `settings`, `checkpoints`. `schemaVersion` and migration policy mandatory. Persist stable IDs, not array indices.

### 23.1. Atomic economy & durability

- IndexedDB transaction updates `wallet.balance`, `inventory.ownedItemIds`, `ledger` in one transaction. Invariant check after write.
- `ledger.referenceId` unique by type for run reward and one-time purchase; repeated transactions abort or return existing result.
- Import sets atomic save (no partial 5000-word corruption if parsing fails).
- Periodic session checkpoint stores gameplay progression **without refunding spent skill charges** if resumed; if implementation cannot safely checkpoint projectiles, restore at wave boundary with documented behavior.
- Backup/export JSON schema version; import backup validate and warn before overwriting.

## 24. Asset fallback / quality safeguards

- `AssetManifest` points to pose images if present and loaded; on 404 fallback to a **clean hand-drawn pempom vector/canvas** that respects body, no feet, eyes and mouth cannon. Never black square/missing texture.
- Fallback monsters are **ONE PURPLE ALIEN SPECIES** reused through session; boss enlarged/modified same family.
- UI icons can be drawn SVG or licensed icon library, but consistent outlined style.
- Avoid hotlinking images from external sites; include assets locally, no copyrighted game sprites.
- If original user image exists as a **single contact sheet**, keep source for designer/Codex reference, don't render contact sheet as a texture on scene. The clean split is a deliverable task or tracked replacement with fallback; **game still must be functional if split pending**.
- Image references/mocks are design aids only; render actual interactive UI and game, not put a big static screenshot in Battle.

## 25. Keyboard, accessibility, localization and performance

- UI language: **Vietnamese default**, some brand labels English acceptable; gameplay supports English input and Vietnamese prompt.
- Input focus: capture only in active game, no stealing focus from text inputs in Import/Edit/Store search; clickable enemy labels and skills reachable by pointer.
- For touch devices, **responsive UI must not break**. True mobile typing combat deferred to P1; show informative desktop-keyboard recommendation rather than nonfunctional game.
- Contrast: labels text ≥14px logical at desktop normal, HUD ≥14–16px; a11y controls with ARIA labels and keyboard focus visible.
- `prefers-reduced-motion`; mute audio; disable overly busy sparks. Error messages nonfatal if audio unavailable.
- Basic Chrome/Edge/Firefox desktop current; no external account required. Aim 60fps desktop, gracefully degrade to 30fps under load. Avoid timers/listeners leaks.
- No remote telemetry P0 by default; user data local. If analytics added later, explicit opt-in and no uploading imported vocabulary without consent.
- Security: sanitize all imported content as **text**, never render arbitrary HTML from spreadsheet; no `eval` or dangerous data URIs; cap Excel size; no cross-origin audio needed for essential game.

---
# VIII. BUILD PLAN, TEST MATRIX & DEFINITION OF DONE

## 26. Thứ tự triển khai tối ưu cho Codex

**Không triển khai kiểu “xây xong trang chủ, phần còn lại để TODO”.** Mỗi milestone phải tạo một **vertical slice** thực sự có thể click/chơi/test; mã nguồn phải build được sau mỗi milestone.

### Milestone 0 — Project bootstrap & working UI shell

- Scaffold app, routes, design tokens, minimal grid background, error boundaries, IndexedDB schema, seed profile+wallet+sets.
- Tạo Home với Play / Word Books / Store / Wardrobe / Progress / Settings hoạt động đưa tới route đúng.
- `npm run dev`, `npm run build`, `npm run test` không lỗi; no blank page.

### Milestone 1 — First playable game loop (highest priority)

- Tạo `BattleScene` với pempom dưới giữa, quái **cùng một species**, prompt label.
- Keyboard targeting/correct typing/bullets/word success, heart, waves, pause, game over/results.
- End-to-end smoke: `PLAY -> BATTLE -> nhập đúng 1 từ -> thấy quái nổ -> RESULT`.
- **Nếu milestone này chưa thật sự chạy, không dành thời gian polish Store.**

### Milestone 2 — Real learning system & data

- 3 modes, import Excel/CSV, word editor, built-in sets, attempt logger, scheduler, Review, Stats.
- Dữ liệu có persistence, schedule test với clock fake. Không hiện đáp án sẵn ở Recall/Listen.

### Milestone 3 — Store, wallet, Wardrobe

- Catalog, coin awarding once, inventory purchases atomic, tabs, preview/equip, hat/shirt/style layer.
- `Shop -> Buy -> Wardrobe -> Equip -> Battle` thay đổi ngoại hình thật, reload vẫn giữ.

### Milestone 4 — Functional skills & boss

- Slow Shot bullet travels/hits and **actual speed reduction**, Freeze Pulse, Shield Bubble, charges/cooldowns + reset, 1 alien boss.
- QA xác thực cooldown pause-safe, skill không auto-clear word.

### Milestone 5 — Polish + test + README

- Improved animation/sfx, 5 pose selection, responsive desktop, accessibility, empty/error states.
- Run unit, integration, e2e tests; fix all major failures.
- README `Installation`, `How to Play`, `Controls`, `Store`, `Assets`, `Tests`, `Known limitations`, `Future map/skin system`.

## 27. Acceptance tests — must pass

### 27.1. UX / Navigation

- [ ] Mở app thấy Home có pempom và các nút rõ ràng, không console error.
- [ ] `PLAY`, Library, Store, Wardrobe, Progress, Settings đều hoạt động.
- [ ] Chọn built-in set -> Prepare -> Battle có ít nhất 1 enemy spawn, keyboard input works without manual focus.
- [ ] Tạm dừng Resume/Restart/Quit; tab hidden auto-pause; Resume không spawn duplicate enemy/timers.
- [ ] Game over/Win đều có Results, Review, Play Again/Home.
- [ ] Không button dead, no infinite loading, no blank/white page, no fake still screenshot.

### 27.2. Visual Art Rules

- [ ] Battle **chỉ có background ô ly**; không cây/hoa/sao/mây/nhà/hành tinh/đồi/nét trang trí nào ngoài đối tượng gameplay/HUD.
- [ ] pempom là sinh vật hồng dạng gốc, không chân, có nòng súng là miệng, mắt/tay đúng concept.
- [ ] Player đứng giữa phía dưới, không nhảy hay đi chạy như Doodle Jump.
- [ ] Có 5 pose bắn + idle/fallback, pose đổi theo enemy không nhảy vị trí.
- [ ] Tất cả mobs **cùng một loài trong một battle**; boss trong wave riêng.
- [ ] Nút giấy sticker / border hand-drawn, chữ tiếng Việt dễ đọc, labels không bị che bởi projectile/VFX.
- [ ] Không dùng mockup làm hình nền che game.

### 27.3. Typing/Combat

- [ ] Gõ `improve` cho cue `cải thiện` -> mỗi char đúng 1 bullet, enemy chết khi hoàn tất, score update.
- [ ] Gõ sai -> không bullet, không tăng tiến độ, hồi phục gõ tiếp bình thường.
- [ ] Nhiều mob cùng chữ đầu: chọn target gần đáy deterministic; click/Tab đổi được target.
- [ ] `Backspace`, `Escape`, Space trong cụm từ, answer aliases xử lý chính xác.
- [ ] Mobs tiến xuống bằng game loop thực; tới đáy mất heart/ghi missed, không deadlock wave.
- [ ] Clear wave 1/2 -> boss wave 3 -> win/lose đúng, không để scene kẹt khi hết mob.
- [ ] `Copy`, `Recall`, `Listen` đều đi vào Battle cùng cơ chế render; nếu TTS không khả dụng có lỗi UX rõ và mode khác vẫn chơi.

### 27.4. Learning/Data

- [ ] Built-in sets có từ đúng, không bị empty và có tiếng Việt có dấu.
- [ ] Import CSV và XLSX hợp lệ tạo set, số từ đúng; file lỗi có message, app không crash.
- [ ] Recall tự gõ không hint làm memory tăng theo lịch, Copy không tự đánh dấu `remembered`.
- [ ] Hint/wrong/timeout recorded và làm từ ưu tiên ôn lại; Slow Shot không bị tính là hint.
- [ ] After Results xem được từ sai và nút Review.
- [ ] Reload giữ Word Sets/History/Memory; backup/export/import JSON hợp lệ.

### 27.5. Store/Inventory/Equip

- [ ] New profile có 250 xu đúng **một lần**.
- [ ] Mua mũ giá 80 xu -> wallet trừ 80 và mũ thành Owned; double-click/reload không trừ lần 2.
- [ ] Thiếu xu -> không mua, hiển thị phản hồi, không mất balance.
- [ ] Equip hat + shirt + style -> Wardrobe nhìn thấy và Battle nhìn thấy; vẫn căn chuẩn 5 poses.
- [ ] Unequip hat/shirt và reset Classic style hoạt động; unowned không được equip.
- [ ] Inventory/coins/equipment survive reload và exit run.
- [ ] Coins chỉ được award once per run, vào lại Results không tạo thêm tiền.

### 27.6. Skill-specific (critical)

- [ ] Skill `Slow Shot` slot 1 có đạn xanh **bay từ pempom tới quái**, không phải flash tại chỗ.
- [ ] Khi va chạm, tốc độ quái giảm thực còn xấp xỉ 35% trong 5s, trở lại bình thường sau hiệu ứng; non-stacking.
- [ ] Boss slowdown cap được áp dụng theo config.
- [ ] Freeze Pulse làm tất cả mob trên màn chậm thật sự; status interaction đúng.
- [ ] Shield hấp thụ đúng 1 va chạm; từ vẫn counted missed.
- [ ] Không skill nào tự đánh dấu từ `correct`, tự tăng recall streak hoặc giết mob không cần gõ đáp án.
- [ ] Mỗi skill tốn charge và có cooldown; không được spam vượt giới hạn; pause không tiêu thời gian hiệu lực.

### 27.7. Robustness

- [ ] Refresh trong Store/Result/Battle không mất inventory/nhân coin/gây data corruption.
- [ ] Resize viewport, click liên tiếp, bấm 10 phím liên tục không unhandled exception.
- [ ] Import 0 dòng, 1 dòng, duplicate, Unicode, câu dài, file lỗi, file quá dung lượng -> xử lý gọn.
- [ ] Chrome và Edge desktop kiểm tra ít nhất; test no asset / no audio fallback.
- [ ] Build production chạy local preview thành công; e2e screenshot và flow được kiểm thực.

## 28. Automated testing — minimal mandatory cases

**Unit tests**

- `targeting.test.ts`: conflict first letter, priority nearest-bottom, click/Tab, enemy dies during target.
- `typing.test.ts`: valid char, invalid char, space/hyphen, aliases, key repeat, completed word exactly once.
- `skills.test.ts`: slow multiplier 0.35, duration 5000ms, reapply refresh, freeze min not product, pause-safe, missing target no charges spent.
- `scheduler.test.ts`: new->learning, two independent recall->remembered, hint/wrong->struggling, copy/listen separate evidence.
- `economy.test.ts`: purchase atomic, insufficient funds, double click idempotent, run coin award idempotent.
- `import.test.ts`: parse Vietnamese Unicode, duplicate, invalid rows, length limits.
- `rig.test.ts`: anchors exist and normalized for all 5 poses.

**Integration**

- Game events update HUD and Attempts once.
- Buy item -> loadout -> pempom Renderer sees visual item.
- Store/Progress/Result persistence after simulated reload.

**Playwright E2E**

1. Fresh profile -> choose set -> Recall -> type one correct word -> see enemy disappear -> end to Results.
2. Seed wallet -> buy Cap -> Equip -> verify Wardrobe and Battle render item.
3. Start battle -> activate Slow Shot -> assert enemy travel distance lower than control -> timeout returns normal.
4. Import a generated sample CSV/XLSX -> choose imported set -> start battle without error.
5. Set browser reload -> profile inventory + coins + learning state remain.

**Visual snapshots** optional nhưng nên có: home, battle one species, store tabs, wardrobe with 5 poses. **Snapshot phải đảm bảo chỉ có grid, không trang trí nền**.

## 29. Definition of Done (DoD) toàn sản phẩm

Một bản được gọi là **đã hoàn thành MVP** khi **đồng thời** đáp ứng:

1. User **chơi được** 3 chế độ và 1 run thắng/thua từ Home đến Results mà không bị kẹt.
2. Từng ký tự đúng tạo **viên đạn bay thật**; ngắm đúng quái; quái xuống đáy, HP, điểm, combo, boss hoạt động.
3. Background đúng **ô ly thuần**, quái trong trận đúng **1 loài**, pempom bám thiết kế gốc + 5 pose.
4. Import file, bộ từ có sẵn, logging attempts, scheduler, review, progress **đúng logic**.
5. Store tồn tại thật, mua/mặc mũ áo/style và skill hoạt động; **Slow Shot thực sự làm chậm quái**.
6. Wallet/inventory/history được persist và idempotent; không mất dữ liệu qua reload.
7. All major user-facing CTA functional, no blank screens/critical console errors.
8. `npm run build`, unit tests, ít nhất một e2e full happy path đều pass.
9. README giải thích cách chạy và nguồn/thiếu sót của assets trung thực; không claim hoàn thành khi chưa test.

---

# IX. CODEX EXECUTION DIRECTIVE

## 30. Paste-ready instruction (Codex must follow)

> Hãy đọc **toàn bộ `spec.md`**, coi đây là nguồn yêu cầu chính. Khảo sát repo hiện tại và asset trước; nếu repo trống thì khởi tạo app theo stack mặc định trong spec. Tạo một game **web hoàn chỉnh có thể thao tác thật**, không làm demo chỉ có hình tĩnh hoặc menu giả. Implement theo các milestone 0–5 trong file, nhưng ưu tiên vertical slice `Home -> Battle -> Results` chơi được trước, sau đó tích hợp Learning, Store/Wardrobe/Skills, Boss và các kiểm thử. Những thay đổi đặc biệt PHẢI giữ: (1) battle background **chỉ ô ly**, tuyệt đối không trang trí; (2) mobs **một species trong toàn trận**; (3) nhân vật gốc pempom hồng 5 hướng bắn; (4) `Slow Shot` có viên đạn thật và giảm tốc quái thật; (5) cửa hàng mua mũ, áo, style và skill bằng xu, trang bị tác động đến Battle. Nếu sprites gốc chỉ ở contact sheet, dùng ảnh gốc làm chuẩn và asset fallback đúng hình để game không kẹt. Viết cả logic và UI, lưu IndexedDB, unit/e2e tests. Tự chạy `npm install`, `npm run build`, `npm run test` và e2e có thể thực hiện trong môi trường; sửa lỗi trước khi kết thúc. Báo cáo hạng mục thực hiện, lệnh run, kết quả test thực và các việc còn chưa hoàn thành một cách trung thực. **Không hỏi lại những yêu cầu đã ghi rõ, không dừng ở kế hoạch hay placeholder.**

### 30.1. Quy trình tự kiểm của Codex

- Scan repo, detect package manager, read assets and routes.
- Implement code to runnable state (not only writing new `.md` documents).
- **Actually start server / build/preview**, verify webpage loads; if browser automation available, click through at least one complete run.
- Test wallet double-purchase, slow projectile, outfit visual update and reload.
- If test tools unavailable, mark `UNVERIFIED` **not PASS**, still provide manual reproduction steps.
- Report files changed, tests executed, known bugs; no silent assumptions.

### 30.2. Do-not-do list

- Do not copy Doodle Jump / ZType assets or trademark.
- Do not replace pempom with a generic spaceship/robot/doodle character if artist source/fallback available.
- Do not add legs to pempom.
- Do not add any decorative scene drawings to battle grid.
- Do not mix species in one battle.
- Do not let skills kill vocabulary without an answer.
- Do not let Copy mode instantly imply durable semantic memory.
- Do not make Store buttons that only show `coming soon` instead of purchases.
- Do not claim slow effect if only blue particles were implemented.
- Do not require Login/Firebase/API keys before gameplay.
- Do not ship with compile failures, empty battle screen, dead buttons, or fake static screenshot.
- Do not claim tests pass without actually executing them.

---

# X. FUTURE EXTENSION POINTS (DO NOT BUILD NOW)

## 31. Maps

Map system later should configure `palette`, `grid color`, `enemySpeciesId`, `difficulty`, `boss`, `music`, maybe environmental **game rules**, but **keep battle background only graph grid unless the product owner explicitly changes this locked constraint**. Map does not automatically mean adding landscape art.

## 32. Skill progression

Later allow skill levels, cosmetic particle bullet trails, limited rare effects, character level perks. Safeguard that ability unlocks change strategy/time pressure, not automatically give correct answers or fake vocabulary mastery.

## 33. Community & monetization

Potential future: cloud sync, sharing set via code/QR, classroom challenges, family-friendly content moderation, subscriptions or cosmetics marketplace. **No purchases with real currency in MVP**; consult applicable rules/policies before monetization and avoid manipulative design for children.

---

## 34. Final handoff checklist

- [ ] `spec.md` placed at repo root.
- [ ] `README.md` has exact instructions to run/test/build.
- [ ] Original 5-pose pempom reference asset included when supplied, never altered destructively.
- [ ] One consistent graph-paper visual system, no decorative backgrounds.
- [ ] End-to-end gameplay functional from pressing Play.
- [ ] 3 learning modes; owned vocab sets + Excel/CSV import.
- [ ] Store/coins/equipment and functional slow bullet included.
- [ ] Tests and verification logs exist.

**If forced to choose between visual polish and functionality, prioritize a *complete playable vertical slice* that passes acceptance tests. Keep project buildable at every step.**
