# Member Photos

Place member photo files in this directory. The app will automatically pick them up — no JSON editing required.

## Naming convention

Two naming schemes are supported. Use whichever you prefer (or mix and match):

### Option A — by member ID

```
elove-1.jpg   ← 大谷映美里 (Otani Emiri)
elove-2.jpg   ← 大場花菜 (Oba Hana)
elove-3.jpg   ← 音嶋莉沙 (Otoshima Risa)
elove-4.jpg   ← 齊藤なぎさ (Saito Nagisa)
elove-5.jpg   ← 佐々木舞香 (Sasaki Maika)
elove-6.jpg   ← 高松瞳 (Takamatsu Hitomi)
elove-7.jpg   ← 瀧脇笙古 (Takiwaki Shoko)
elove-8.jpg   ← 野口衣織 (Noguchi Iori)
elove-9.jpg   ← 諸橋沙夏 (Morohashi Sana)
elove-10.jpg  ← 山本杏奈 (Yamamoto Anna)

nme-1.jpg     ← 尾木波菜 (Ogi Hana)
nme-2.jpg     ← 落合希来里 (Ochiai Kirari)
nme-3.jpg     ← 蟹澤萌子 (Kanisawa Moeko)
nme-4.jpg     ← 川中子奈月心 (Kawaguchi Natsune)
nme-5.jpg     ← 河野奈津美 (Kawanago Natsumi)
nme-6.jpg     ← 櫻井もも (Sakurai Momo)
nme-7.jpg     ← 涼海みさき (Suganami Mirei)
nme-8.jpg     ← 鈴木瞳美 (Suzuki Hitomi)
nme-9.jpg     ← 谷崎早耶 (Tanizaki Saya)
nme-10.jpg    ← 冨田菜々風 (Tomita Nanaka)
nme-11.jpg    ← 永田詩央里 (Nagata Shiori)
nme-12.jpg    ← 本田珠由記 (Honda Miyuki)

njoy-1.jpg    ← 相田珠里依 (Aida Jurii)
njoy-2.jpg    ← 天野香乃愛 (Amano Konoa)
njoy-3.jpg    ← 市原歩夢 (Ichihara Ayumi)
njoy-4.jpg    ← 江角怜音 (Esumi Renon)
njoy-5.jpg    ← 押田美月 (Oshida Mitsuki)
njoy-6.jpg    ← 大西葵 (Onishi Aoi)
njoy-7.jpg    ← 小澤愛実 (Ozawa Aimi)
njoy-8.jpg    ← 高橋舞 (Takahashi Mai)
njoy-9.jpg    ← 藤沢莉子 (Fujisawa Riko)
njoy-10.jpg   ← 村山結香 (Murayama Yuuka)
njoy-11.jpg   ← 山田百華 (Yamada Momoka)
njoy-12.jpg   ← 山野愛月 (Yamano Arisu)
```

### Option B — by romaji name (lowercase + underscores)

```
otani_emiri.jpg      ← 大谷映美里
oba_hana.jpg         ← 大場花菜
otoshima_risa.jpg    ← 音嶋莉沙
saito_nagisa.jpg     ← 齊藤なぎさ
sasaki_maika.jpg     ← 佐々木舞香
takamatsu_hitomi.jpg ← 高松瞳
takiwaki_shoko.jpg   ← 瀧脇笙古
noguchi_iori.jpg     ← 野口衣織
morohashi_sana.jpg   ← 諸橋沙夏
yamamoto_anna.jpg    ← 山本杏奈

ogi_hana.jpg         ← 尾木波菜
ochiai_kirari.jpg    ← 落合希来里
kanisawa_moeko.jpg   ← 蟹澤萌子
kawaguchi_natsune.jpg ← 川中子奈月心
kawanago_natsumi.jpg ← 河野奈津美
sakurai_momo.jpg     ← 櫻井もも
suganami_mirei.jpg   ← 涼海みさき
suzuki_hitomi.jpg    ← 鈴木瞳美
tanizaki_saya.jpg    ← 谷崎早耶
tomita_nanaka.jpg    ← 冨田菜々風
nagata_shiori.jpg    ← 永田詩央里
honda_miyuki.jpg     ← 本田珠由記

aida_jurii.jpg       ← 相田珠里依
amano_konoa.jpg      ← 天野香乃愛
ichihara_ayumi.jpg   ← 市原歩夢
esumi_renon.jpg      ← 江角怜音
oshida_mitsuki.jpg   ← 押田美月
onishi_aoi.jpg       ← 大西葵
ozawa_aimi.jpg       ← 小澤愛実
takahashi_mai.jpg    ← 高橋舞
fujisawa_riko.jpg    ← 藤沢莉子
murayama_yuuka.jpg   ← 村山結香
yamada_momoka.jpg    ← 山田百華
yamano_arisu.jpg     ← 山野愛月
```

The app tries Option A first, then Option B automatically — so both work without any configuration.

## Supported formats

`.jpg` / `.jpeg`, `.png`, `.webp` are all fine. The auto-discovery above only tries `.jpg`.  
If you use a different extension, set the `"photo"` field in `public/members.json` to the exact path, e.g. `"members/honda_miyuki.png"`.

## How it works

When a member has no `"photo"` value in `members.json`, the app first tries `members/<id>.jpg`, then `members/<romaji_slug>.jpg`. If neither file exists the card shows a coloured initial placeholder instead — so you can add photos for just the members you have without breaking anything.

