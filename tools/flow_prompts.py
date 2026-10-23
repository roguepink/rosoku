# Google Flow で作る 21灯の指示文(2026-10-24 作り直し)。背景は ろうそくごとに合う場所。順番はアプリの並び。
# 1灯ごとに: 火がついた静止画(LIT)→ それを直して 火が消えた静止画(UNLIT)→ 最初と最後が同じ絵の 8秒動画(VIDEO)
BASE = ("Photorealistic night photograph, vertical 9:16, static locked-off camera, centered composition. {s} "
        "The light stands exactly in the horizontal center of the frame, its flame about 40% from the top of the frame. "
        "Setting: {bg} The only light is the warm amber candlelight (about 1850K): it softly lights the nearest surfaces and fades to deep darkness "
        "toward the edges and the top. Very dark, calm, quiet Japanese night mood, generous dark space above the flame. No people, no text, no lettering.")
WA = "The flame is large, calm, tall and orange with a soft rounded tip, the thick dark hollow wick visible inside it, a tiny blue base."
C = [
  ("wa-shiro", "白の和ろうそく", "和ろうそく",
   "A single traditional Japanese candle (warosoku, ikari shape: slightly wider at the top, ivory-white haze wax, matte), about 15 cm tall, on a simple black iron candlestick (shokudai). " + WA,
   "a plain tokonoma alcove of pale unfinished hinoki wood and a rough clay wall; to one side a shoji screen faintly blue with moonlight."),
  ("shu", "朱ろうそく", "朱",
   "A vermilion-red traditional Japanese candle (shu-rousoku, ikari shape, wider at the top), about 18 cm tall, on a vermilion-lacquered candlestick with a thin gold line. " + WA,
   "inside a quiet Shinto shrine hall at night: dark aged wooden floor, thick vermilion-lacquered pillars fading into the dark behind, a hint of a hanging straw rope far back."),
  ("botan", "絵ろうそく・牡丹", "牡丹",
   "An Aizu painted Japanese candle (e-rousoku, ikari shape, ivory-white wax), about 20 cm tall, hand-painted with two large crimson-and-pink peonies and dark green leaves, on a black-lacquered candlestick with a thin gold line. " + WA,
   "an old Aizu storehouse (kura): thick dark wooden beams, a black-and-red Aizu lacquer tray under the candlestick, old wooden chests faintly visible in the dark."),
  ("andon", "行灯", "行灯",
   "A traditional Japanese square paper lantern (kaku-andon): black-lacquered wooden frame with off-white washi panels, about 40 cm tall, a candle burning inside; the washi glows softly in warm amber, brighter in the middle.",
   "an old ryokan guest room: tatami mats, sliding fusuma doors with faded ink landscape painting behind, a low wooden table edge in the dark."),
  ("take", "竹あかり", "竹あかり",
   "A bamboo lantern (take-akari): a tall section of aged bamboo, about 11 cm wide and 45 cm tall, with many small round holes in flowing diagonal patterns, a candle burning inside; warm golden light shines through every hole and from the open top.",
   "a narrow stone path in a dark bamboo grove at night: tall green bamboo trunks behind, softly dotted with the projected points of light from the holes, fallen bamboo leaves on the stones."),
  ("kin", "金ろうそく", "金",
   "A gold-leaf Japanese candle (kin-rousoku, ikari shape), about 16 cm tall, covered in gold leaf with faint square seams, softly gleaming, on a vermilion-lacquered candlestick. " + WA,
   "in front of a dim antique gold-leaf folding screen (kinbyobu) with faint pine branches, on a black lacquer floor; the gold catches the candlelight softly."),
  ("wa-e", "絵ろうそく・椿", "椿",
   "A vermilion-red painted Japanese candle (e-rousoku, ikari shape), about 15 cm tall, hand-painted with two white camellias with yellow centers and dark green leaves, on a simple black iron candlestick. " + WA,
   "on the wooden engawa veranda of an old house on a snowy night: glass doors behind with snow faintly falling outside, a red camellia bush in the snow barely visible in the dark."),
  ("bonbori", "雪洞", "雪洞",
   "A traditional Japanese bonbori lamp: a hexagonal washi paper shade, slightly wider at the top, on a slender vermilion-lacquered pole with a round base, about 45 cm tall, a candle glowing inside the paper.",
   "a Hinamatsuri doll stand covered with red felt (hi-mosen) at night; the dolls are only faint dark shapes far behind, the red felt glowing near the lamp."),
  ("kinari", "生成りのろうそく", "生成り",
   "A natural unbleached haze-wax Japanese candle (kinari, straight bar shape, deep warm yellow wax, slightly translucent), about 14 cm tall, on a small grey-glazed ceramic candle stand. " + WA,
   "the earthen-floored kitchen (doma) of an old farmhouse: a sunken irori hearth with an iron kettle hanging from a wooden hook to one side, smoke-blackened beams above."),
  ("toumyou", "灯明皿", "灯明皿",
   "A traditional Japanese oil lamp (toumyou-zara): a small unglazed reddish clay dish filled with dark amber rapeseed oil, a white rush-pith wick resting over the rim, a small flame at the edge of the dish, on top of a tall slender dark wooden lamp stand. The flame is small and orange with a darker sooty tip.",
   "the worn wooden floor of an old mountain temple hall: dark thick pillars, a faint ink scroll on the wall, deep darkness."),
  ("ume", "絵ろうそく・梅", "梅",
   "A slim Japanese painted candle (straight bar shape, ivory-white wax), about 15 cm tall, hand-painted with small red plum blossoms along a thin dark branch winding up it, on a simple black iron candlestick. " + WA,
   "a small study by a round window (marumado) in early spring: a real plum branch with red blossoms in a simple vase beside it, the window paper faintly grey with night."),
  ("kiku", "絵ろうそく・菊", "菊",
   "A Japanese painted candle (ikari shape, ivory-white wax), about 17 cm tall, hand-painted with one large golden-yellow chrysanthemum and two small white chrysanthemums with green leaves, on a black-lacquered candlestick. " + WA,
   "an autumn shoin room: tatami, a low writing desk, a few real yellow chrysanthemums in a bamboo vase, a shoji screen behind."),
  ("teshoku", "手燭(ガラスのほや)", "手燭",
   "A Japanese brass hand candlestick (teshoku) with a round brass dish and a short handle, holding a white candle inside a tall clear glass chimney that bulges gently in the middle; the calm slender flame seen through the glass with soft reflections.",
   "set on the polished dark wooden floor of a long old corridor at night: a row of shoji on one side disappearing into darkness, the floorboards gleaming faintly."),
  ("hyakume", "百匁ろうそく", "百匁",
   "A very large traditional Japanese temple candle (hyakume warosoku, ikari shape, ivory-white wax), about 25 cm tall and 7 cm wide, on a large brass candlestick. A big, tall, orange flame with a thick curled charred wick.",
   "the main hall of a large old temple: massive dark wooden pillars, a big brass incense burner and dim gold ornaments far behind in deep darkness."),
  ("ayame", "絵ろうそく・あやめ", "あやめ",
   "A slim Japanese painted candle (straight bar shape, ivory-white wax), about 15 cm tall, hand-painted with three purple iris flowers and tall green leaves, on a brass candlestick. " + WA,
   "a rainy June night by an open window: rain falling outside, real purple irises by a pond barely visible in the dark, raindrops on the wooden sill."),
  ("mame", "豆ろうそく", "豆",
   "A tiny thin white Japanese candle (mame-rousoku), about 8 cm tall, on a small unglazed clay saucer. A small calm orange flame.",
   "the top of a small old writing desk (fuzukue): a sheet of washi paper, a brush and an inkstone beside it, a dark wall behind."),
  ("mitsurou", "蜜ろう", "蜜ろう",
   "A golden honey-colored beeswax pillar candle with a faint honeycomb texture, about 9 cm tall and 5 cm wide, on a small dark wooden dish. The melted pool glows amber. A calm golden flame.",
   "an old wooden shelf in a quiet craftsman's workshop: a small jar of honey and a wooden honey dipper beside it, rough wooden boards behind."),
  ("tea", "小さな灯（豆皿）", "小さな灯",
   "A small tealight candle in a ribbed aluminum cup, sitting on a small grey-glazed ceramic dish (mamezara). A small calm flame; the clear melted wax pool glows.",
   "a tea room (chashitsu) at night: tatami, a black raku tea bowl and a bamboo whisk beside it, a rough clay wall behind."),
  ("hashira", "白い柱のろうそく", "白い柱",
   "A thick white pillar candle, about 7.5 cm wide and 11 cm tall, burned down in the middle so its wax walls glow warmly from inside like a lantern; the calm flame sits low inside the hollow.",
   "on a flat stone inside an old storehouse with thick white plaster (shikkui) walls and a small iron-barred window, deep shadows."),
  ("hosoi", "細いろうそく", "細いろうそく",
   "A slim ivory taper candle about 20 cm tall in a simple brass candlestick. A calm slender flame.",
   "a quiet study at night: stacks of old Japanese string-bound books and a wooden bookshelf behind, a reading desk."),
  ("nejiri", "ねじりろうそく", "ねじり",
   "An unusual sculptural Japanese candle of plain ivory-white haze wax, about 22 cm tall, twisted into a tall slow spiral like a twisted rope, thicker at the bottom and tapering toward the top, standing on a simple black iron candlestick. No figures, no faces, just the twisted wax form. " + WA,
   "a modern Japanese room: a wall of dark charcoal-grey plaster with subtle trowel marks, a single slab of black stone as the base, minimal and quiet."),
]
UNLIT = ("Keep this exact image, same framing and every object unchanged, but the candle has just been put out: there is no flame at all, "
         "only the dark wick with a tiny glowing red ember at its tip. The scene is now lit only by very faint dim ambient light, much darker overall. No smoke.")
UNLIT_COVERED = ("Keep this exact image, same framing and every object unchanged, but the light inside has been put out: the paper/bamboo no longer glows, "
                 "the scene is lit only by very faint dim ambient light, much darker overall.")
VIDEO = ("Static locked-off camera, nothing moves except the light. The candle flame flickers and sways gently and naturally, "
         "stretching and shrinking slowly, with soft breathing changes of the warm light on the surroundings. No camera motion, no new objects, no people. Silent.")
COVERED = {"andon", "bonbori", "take"}
VIDEO_COVERED = ("Static locked-off camera, nothing moves except the light. The candlelight inside the lantern flickers softly and naturally, "
                 "the glow breathing gently. No camera motion, no new objects, no people. Silent.")

def lit(i):
    cid, name, short, s, bg = C[i]
    return BASE.format(s=s, bg=bg)

if __name__ == "__main__":
    import sys
    i = int(sys.argv[1]); kind = sys.argv[2] if len(sys.argv) > 2 else "lit"
    cid = C[i][0]
    print({"lit": lit(i), "unlit": UNLIT_COVERED if cid in COVERED else UNLIT, "video": VIDEO_COVERED if cid in COVERED else VIDEO}[kind])
