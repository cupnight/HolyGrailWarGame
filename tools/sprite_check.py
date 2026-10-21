#!/usr/bin/env python3
"""성배가 차는 밤 · 도트 그림 검수 도구

아트 가이드(그림 작업 전달서)의 규칙대로 그림이 그려졌는지 확인합니다.

  python3 tools/sprite_check.py                     # public/assets/sprites 전체 검사
  python3 tools/sprite_check.py lancelot.png        # 파일 하나만
  python3 tools/sprite_check.py --sheet out/        # 문제 칸을 표시한 확인용 그림을 out/에 저장
  python3 tools/sprite_check.py --fix out/          # 기계적으로 고칠 수 있는 것을 고친 사본을 out/에 저장
  python3 tools/sprite_check.py --manifest          # manifest.json에 빠진 항목을 기본값으로 채움
  python3 tools/sprite_check.py --json report.json  # 결과를 JSON으로도 저장

원본 그림은 고치지 않습니다(--fix는 사본을 만듭니다). manifest.json만 --manifest를 줄 때 고칩니다.
"""
import argparse, json, os, re, sys
from itertools import combinations

try:
    import numpy as np
    from PIL import Image, ImageDraw
except ImportError:
    sys.exit('PIL(Pillow)과 numpy가 필요합니다: pip install pillow numpy')

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SPRITES = os.path.join(ROOT, 'public', 'assets', 'sprites')

CELL = 256          # 한 칸 크기
COLS = 6
GROUND = 240        # 발바닥 높이(칸 위에서)
MARGIN = 8          # 칸 가장자리 여백
PX_PER_CM = 0.8
MAX_BODY = 224      # 칸에 들어가는 최대 몸 키(약 280cm)

# 서번트 설정 신장(cm) — 아트 가이드의 서번트 112명 표
HEIGHT = dict(sigurd=178, siegfried=190, artoria=154, nero=150, gawain=180, mordred=154, altera=160, charlemagne=176,
    bedivere=187, okita=158, musashi=167, rama=168, richard=178, cuchulainn=185, hector=180, leonidas=188, diarmuid=184,
    karna=178, vlad=191, elizabeth=154, enkidu=170, scathach=168, romulus=190, brynhild=172, qinliangyu=166, fionn=181,
    caenis=174, quixote=148, percival=195, kagetora=167, arjuna=177, robin=175, atalanta=166, emiya=187, gilgamesh=182,
    chiron=179, arash=185, tristan=186, nobunaga=152, tomoe=162, tesla=190, napoleon=189, orion=165, superorion=230,
    ptolemaios=182, alexander=212, boudica=174, achilles=185, medusa=172, drake=162, astolfo=164, georgios=180, teach=210,
    ozymandias=179, medb=154, ushiwaka=168, ivan=531, odysseus=179, hippolyta=159, shingen=185, medea=163, merlin=178,
    paracelsus=183, gilles=196, tamamo=160, andersen=146, shakespeare=180, davinci=160, nitocris=162, mozart=180,
    sanzang=160, circe=147, avicebron=161, prelati=152, solomon=178, jingke=159, kojiro=176, cursedarm=215, hundred=170,
    serenity=161, kinghassan=220, semiramis=169, jack=134, lishuwen=166, sanson=178, shuten=145, lancelot=191,
    heracles=253, spartacus=221, lubu=225, frankenstein=172, asterios=298, darius=345, beowulf=186, kintoki=190,
    raikou=175, ibaraki=147, penthesilea=158, hijikata=187, caligula=185, morgan=170, kriemhild=168, jeanne=159,
    qinshihuang=180, amakusa=169, holmes=183, dantes=185, salieri=181, hessian=181, kagekiyo=172, angra=167, jalter=159)

# 마스터 유형 — 성별이 고정된 유형은 그 성별만
MASTER_TYPES = {t: 'mf' for t in ('heir exec elder student avenger merc veteran detective collector cultist prodigy '
    'artist executor eighth atlas lord democrat wanderer apostle killer exorcist flunk fortune streamer stage inlaw '
    'antique amnesia exile lecturer kendo').split()}
MASTER_TYPES.update(priest='m', burial='f', mother='f')
BASE = {f'base_{s}_{a}' for s in 'mf' for a in ('child', 'young', 'adult', 'elder')}

SERVANT_ACTIONS = {
    'idle':     ([0, 5, 6, 11, 6, 5], [400] * 6, False),
    'attack':   ([0, 1, 2, 3, 4, 5], [140, 160, 140, 100, 180, 650], False),
    'hit':      ([6, 7, 8, 11], [160, 140, 240, 650], False),
    'dodge':    ([6, 9, 11], [160, 320, 500], False),
    'guard':    ([6, 10, 11], [160, 650, 500], False),
    'ultimate': ([12, 13, 14, 15, 16, 17], [220, 320, 450, 140, 220, 750], False),
    'down':     ([18, 19, 20, 21, 22, 23], [220, 220, 240, 200, 220, 1100], True),
}
MASTER_ACTIONS = {
    'idle':     ([0, 1, 0, 1], [400] * 4, False),
    'surprise': ([0, 2, 2, 0], [150, 350, 350, 300], False),
    'seal':     ([0, 3, 3, 1], [160, 450, 450, 350], False),
    'hit':      ([0, 4, 4, 1], [150, 250, 400, 350], False),
    'down':     ([4, 5], [250, 1200], True),
}
SERVANT_CELL_NAMES = ['대기①', '예비', '치켜듦', '베기', '마무리', '대기②', '대기③', '맞는 순간', '움찔', '피함', '방어', '대기④',
                      '자세', '힘 모으기', '해방 직전', '해방', '마무리', '복귀', '휘청', '균형 잃음', '넘어짐', '바닥에 닿음', '누움', '정지']
BASIC_CELL_NAMES = ['대기①', '대기②', '대기③', '대기④', '맞는 순간', '움찔', '피함', '방어', '휘청', '넘어짐', '바닥에 닿음', '누움']
ATTACK_CELL_NAMES = ['예비', '치켜듦', '베기', '마무리', '복귀', '대기']
NP_CELL_NAMES = ['자세', '힘 모으기', '해방 직전', '해방', '마무리', '복귀']
MASTER_CELL_NAMES = ['대기', '숨쉬기', '놀람', '령주', '다침', '쓰러짐']
BIG_SUFFIX = {'attack': ATTACK_CELL_NAMES, 'np': NP_CELL_NAMES, 'special': [f'전용{k}' for k in range(1, 7)]}

# 시트 형식: 칸 크기·열·행·발 기준·대기 칸·발이 기준선에 있어야 하는 칸
LAYOUTS = {
    'legacy': dict(cell=256, cols=6, rows=(4, 5), ground=240, idle=[0, 5, 6, 11], standing=[0, 5, 6, 11, 17],
                   names=SERVANT_CELL_NAMES + [f'전용{k}' for k in range(1, 7)], desc='서번트 예전 24칸 1536×1024(5행 포함 시 1536×1280)'),
    'basic': dict(cell=256, cols=6, rows=(2,), ground=240, idle=[0, 1, 2, 3], standing=[0, 1, 2, 3],
                  names=BASIC_CELL_NAMES, desc='서번트 기본 시트 1536×512'),
    'big': dict(cell=512, cols=3, rows=(2,), ground=496, idle=[], standing=[0, 5],
                names=None, desc='공격·보구 시트 1536×1024(512px 칸 3×2)'),
    'master': dict(cell=256, cols=6, rows=(1,), ground=240, idle=[0, 1], standing=[0, 1, 2, 3, 4],
                   names=MASTER_CELL_NAMES, desc='마스터·일반인 1536×256'),
}


def split_stem(stem):
    """'artoria_np' -> ('artoria', 'np'), 'artoria' -> ('artoria', None)"""
    m = re.fullmatch(r'(.+)_(attack|np|special)', stem)
    return (m.group(1), m.group(2)) if m else (stem, None)


def kind_of(stem):
    stem = split_stem(stem)[0]
    if stem in HEIGHT:
        return 'servant'
    if stem in BASE:
        return 'base'
    m = re.fullmatch(r'm_([a-z]+)_([mf])', stem)
    if m and m.group(1) in MASTER_TYPES and m.group(2) in MASTER_TYPES[m.group(1)]:
        return 'master'
    return None


def expected_body(stem, kind):
    stem = split_stem(stem.lower())[0]
    if kind_of(stem) is None:  # 이름이 틀린 파일: 마스터·서번트 평균값으로
        return (135 if kind != 'servant' else 140), False
    if kind == 'servant':
        return min(round(HEIGHT[stem] * PX_PER_CM), MAX_BODY), HEIGHT[stem] * PX_PER_CM > MAX_BODY
    if kind == 'base':
        s, a = stem.split('_')[1:]
        return (96 if a == 'child' else 140 if s == 'm' else 130), False
    t, s = stem.split('_')[1:]
    if t == 'prodigy':
        return 120, False
    return (140 if s == 'm' else 130), False


def cell(a, i, L=None):
    L = L or LAYOUTS['legacy']
    cs, cols = L['cell'], L['cols']
    r, c = divmod(i, cols)
    return a[r * cs:(r + 1) * cs, c * cs:(c + 1) * cs]


def foot_y(alpha):
    """발바닥 높이: 아래에서부터 불투명 픽셀이 두 발 정도(24px 이상) 놓인 첫 줄."""
    rows = (alpha >= 128).sum(1)
    ys = np.where(rows >= 24)[0]
    return int(ys.max()) if len(ys) else None


def check_file(path, manifest_entry):
    stem = os.path.splitext(os.path.basename(path))[0]
    res = {'file': os.path.basename(path), 'errors': [], 'warnings': [], 'info': [], 'cells': {}}
    E, W, I = res['errors'].append, res['warnings'].append, res['info'].append

    if os.path.basename(path) != os.path.basename(path).lower() or not re.fullmatch(r'[a-z0-9_]+\.png', os.path.basename(path)):
        E('파일 이름은 영문 소문자·숫자·밑줄과 .png만 씁니다 (예: lancelot.png)')
    kind = kind_of(stem)
    res['kind'] = kind
    if kind is None:
        E(f'가이드 목록에 없는 이름입니다: {stem}. 서번트 id, m_<유형>_<m|f>, base_<m|f>_<나이대> 중 하나여야 합니다')

    im = Image.open(path)
    if kind is None:  # 이름으로 모르면 크기로 짐작해서 나머지 검사를 이어 간다
        kind = 'master' if im.size[1] == CELL else 'servant'
    if im.mode != 'RGBA':
        E(f'투명 배경 PNG가 아닙니다 (지금 {im.mode}). RGBA로 저장해 주세요')
        im = im.convert('RGBA')
    a = np.array(im)
    alpha = a[:, :, 3]
    H, Wd = alpha.shape
    suffix = split_stem(stem)[1]
    if kind == 'servant' and suffix:
        lay = 'big'
    elif kind == 'servant':
        lay = 'basic' if H in (512, 1024) and not (H == 1024 and (alpha[512:] > 0).sum() > 2000) else 'legacy'
        if H == 1024 and lay == 'basic':
            W('기본 시트인데 1536×1024입니다. 아래 절반이 비어 있으니 위 1536×512만 잘라 올려 주세요')
            a = a[:512]; alpha = a[:, :, 3]; H = 512
    else:
        lay = 'master'
    L = LAYOUTS[lay]
    cs, cols, ground = L['cell'], L['cols'], L['ground']
    res['layout'] = lay
    if Wd != cs * cols or H not in tuple(r * cs for r in L['rows']):
        E(f'크기가 {Wd}×{H}입니다. {L["desc"]}이어야 합니다')
        return res, a
    n = (H // cs) * cols
    names = L['names'] or BIG_SUFFIX.get(suffix, [])

    # 투명도
    # 투명도 240 이상은 눈으로 불투명과 같아서 허용, 16 이하는 '거의 안 보이는 점'
    semi = int(((alpha > 16) & (alpha < 240)).sum())
    faint = int(((alpha > 0) & (alpha <= 16)).sum())
    opaque = int((alpha >= 240).sum())
    if semi:
        W(f'반투명 픽셀 {semi:,}개 (불투명 픽셀의 {semi / max(opaque, 1):.1%}). 테두리가 흐려 보입니다. '
          '완전 투명/불투명만 쓰는 게 규칙입니다 → --fix로 정리 가능')
    if faint:
        W(f'거의 안 보이는 점 {faint:,}개가 남아 있습니다. 화면에는 안 보여도 그림 크기 계산을 흐립니다 → --fix로 정리 가능')

    def label(i):
        return f'{i}번({names[i] if i < len(names) else ""})'

    # 칸별 검사
    for i in range(n):
        al = cell(alpha, i, L)
        info = {}
        solid = al >= 128
        if not solid.any():
            if lay == 'legacy' and i >= 24:
                continue
            E(f'{label(i)} 칸이 비어 있습니다')
            continue
        ys, xs = np.where(solid)
        info['bbox'] = [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())]
        # 가장자리
        d = {'왼쪽': int(xs.min()), '오른쪽': int(cs - 1 - xs.max()), '위': int(ys.min()), '아래': int(cs - 1 - ys.max())}
        cut = [s for s, v in d.items() if v == 0]
        near = [f'{s} {v}px' for s, v in d.items() if 0 < v < MARGIN]
        if cut:
            E(f'{label(i)}: 칸 {"·".join(cut)} 끝에 닿아 그림이 잘립니다')
            info['cut'] = cut
        elif near:
            W(f'{label(i)}: 가장자리 여백 8px보다 가깝습니다 ({", ".join(near)})')
        # 여백선에서 칼로 자른 듯 끊긴 그림(규칙을 맞추려고 잘라 낸 경우)
        lines = {'왼쪽': solid[:, MARGIN], '오른쪽': solid[:, cs - 1 - MARGIN], '위': solid[MARGIN, :], '아래': solid[cs - 1 - MARGIN, :]}
        clipped = [f'{s} {int(v.sum())}px' for s, v in lines.items() if d[s] == MARGIN and v.sum() >= 6]
        if clipped:
            W(f'{label(i)}: 그림이 8px 여백선에서 곧게 잘린 것 같습니다 ({", ".join(clipped)}). 잘린 부분이 없도록 칸 안으로 옮겨 그려야 합니다')
            info['clipped'] = clipped
            info['near'] = near
        # 발바닥
        fy = foot_y(al)
        info['foot'] = fy
        if i in L['standing'] and fy is not None and abs(fy - ground) > 4:
            (E if abs(fy - ground) > 8 else W)(f'{label(i)}: 발바닥이 y{fy}에 있습니다 (기준 y{ground})')
        res['cells'][i] = info

    # 대기 칸이 서로 다른지
    for p, q in combinations(L['idle'], 2):
        diff = int((np.abs(cell(a, p, L).astype(int) - cell(a, q, L).astype(int)).sum(-1) > 30).sum())
        if diff == 0:
            E(f'대기 칸 {p}번과 {q}번이 픽셀까지 똑같습니다. 숨쉬기·흔들림으로 조금씩 달라야 대기 동작이 살아납니다')
        elif diff < 40:
            W(f'대기 칸 {p}번과 {q}번 차이가 아주 작습니다 ({diff}px)')

    # 몸 키
    exp, giant = expected_body(stem, kind)
    fy = res['cells'].get(0, {}).get('foot')
    top = res['cells'].get(0, {}).get('bbox', [0, 0])[1]
    if fy is not None:
        raw = fy - top + 1
        res['raw0'] = raw
        what = '첫 칸' if lay == 'big' else '대기 첫 칸'
        I(f'{what} 높이(장식·무기 포함) {raw}px, 가이드 몸 키 {exp}px' + (' (거대 서번트: 칸 안 최대)' if giant else ''))
        if lay != 'big' and raw < exp * 0.85:
            W(f'그림이 가이드 몸 키({exp}px)보다 작아 보입니다 (장식 포함 {raw}px)')
    me = manifest_entry or {}
    fname = os.path.basename(path)
    bp = me.get('bodyPx')
    if not manifest_entry:
        W('manifest.json에 이 그림 항목이 없습니다' + ('' if lay == 'big' else ' → --manifest로 기본 항목을 추가할 수 있습니다'))
    elif bp is None:
        W(f'manifest.json에 bodyPx가 없습니다 (가이드 기준 {exp}px)')
    elif lay != 'big':
        if not giant and abs(bp - exp) > max(6, exp * 0.06):
            W(f'manifest bodyPx {bp}가 가이드 몸 키 {exp}px와 다릅니다')
        if giant and bp > MAX_BODY:
            E(f'거대 서번트 bodyPx {bp}가 칸 최대 {MAX_BODY}px을 넘습니다. 그린 그림의 실제 몸 키를 적어 주세요')
    if manifest_entry:
        acts = me.get('actions') or {}
        if lay == 'big':
            mine = {k: v for k, v in acts.items() if v.get('file') == fname}
            if not mine:
                W(f'manifest의 어떤 동작도 {fname}을 쓰지 않습니다 (actions.attack/ultimate의 file·cell 확인)')
            for k, v in mine.items():
                if v.get('cell') != 512:
                    E(f'manifest {k}: cell이 {v.get("cell")}입니다 (512여야 함)')
        else:
            if me.get('file') != fname:
                E(f'manifest의 file이 {me.get("file")}입니다')
            if (me.get('width'), me.get('height')) != (Wd, H):
                E(f'manifest 크기 {me.get("width")}×{me.get("height")}가 실제 {Wd}×{H}와 다릅니다')
            mine = {k: v for k, v in acts.items() if v.get('file', fname) == fname}
            if not me.get('revision'):
                W('manifest에 revision(그림 버전 이름)이 없습니다')
        for act, v in mine.items():
            fr, du = v.get('frames', []), v.get('durationMs', [])
            if isinstance(du, list) and len(fr) != len(du):
                E(f'manifest {act}: frames와 durationMs 개수가 다릅니다')
            if any(f >= n or f < 0 for f in fr):
                E(f'manifest {act}: 없는 칸 번호가 있습니다 ({fr})')
        if lay == 'basic' and 'idle' in acts and acts['idle'].get('frames', [])[:4] != [0, 1, 2, 3]:
            W(f'manifest idle 프레임이 {acts["idle"].get("frames")}입니다 (기본 시트는 0·1·2·3·2·1)')

    # 픽셀 격자(권장)
    sm = a[::8, ::8]
    up = np.repeat(np.repeat(sm, 8, 0), 8, 1)[:H, :Wd]
    mis = float(((np.abs(up.astype(int) - a.astype(int)).sum(-1) > 30) & (alpha > 0)).sum() / max(opaque, 1))
    I(f'8px 격자 정렬: 불투명 픽셀의 {1 - mis:.0%}가 격자에 맞음' + (' (권장 사항이라 오류는 아님)' if mis > 0.1 else ''))
    return res, a


def draw_sheet(res, a, out):
    """문제를 표시한 확인용 그림: 발 기준선, 여백선(8px), 문제 칸 테두리."""
    L = LAYOUTS[res.get('layout', 'legacy')]
    cs, cols, ground = L['cell'], L['cols'], L['ground']
    H, Wd = a.shape[:2]
    bg = Image.new('RGBA', (Wd, H), (38, 36, 48, 255))
    bg.alpha_composite(Image.fromarray(a))
    d = ImageDraw.Draw(bg)
    for r in range(H // cs):
        for c in range(cols):
            x0, y0 = c * cs, r * cs
            i = r * cols + c
            d.rectangle([x0 + MARGIN, y0 + MARGIN, x0 + cs - MARGIN - 1, y0 + cs - MARGIN - 1], outline=(110, 110, 140, 255))
            d.line([x0, y0 + ground, x0 + cs - 1, y0 + ground], fill=(90, 200, 140, 255))
            ci = res['cells'].get(i, {})
            col = (230, 60, 70, 255) if ci.get('cut') else (240, 180, 60, 255) if ci.get('near') or ci.get('clipped') else None
            if col:
                d.rectangle([x0, y0, x0 + cs - 1, y0 + cs - 1], outline=col, width=4)
            d.text((x0 + 6, y0 + 4), str(i), fill=(200, 200, 220, 255))
    bg.save(out)


def fix_copy(a, out):
    """기계적 수정: 반투명 픽셀을 완전 투명/불투명으로, 거의 안 보이는 점 제거."""
    b = a.copy()
    al = b[:, :, 3]
    b[:, :, 3] = np.where(al >= 128, 255, 0).astype(np.uint8)
    b[b[:, :, 3] == 0] = 0
    Image.fromarray(b).save(out)


def default_entry(stem, kind, w, h, bp):
    acts = SERVANT_ACTIONS if kind == 'servant' else MASTER_ACTIONS
    return {'id': stem, 'name': stem, 'kind': 'servant' if kind == 'servant' else 'master', 'file': stem + '.png',
            'width': w, 'height': h, 'columns': COLS, 'rows': h // CELL, 'frames': (h // CELL) * COLS,
            'actions': {k: {'frames': f, 'durationMs': d, 'holdLast': hl} for k, (f, d, hl) in acts.items()},
            'revision': 'unnamed', 'bodyPx': bp}


def main():
    ap = argparse.ArgumentParser(description='도트 그림 검수')
    ap.add_argument('files', nargs='*', help='검사할 파일 (기본: sprites 폴더 전체)')
    ap.add_argument('--dir', default=SPRITES)
    ap.add_argument('--sheet', metavar='DIR', help='문제를 표시한 확인용 그림 저장 폴더')
    ap.add_argument('--fix', metavar='DIR', help='반투명 정리한 사본 저장 폴더')
    ap.add_argument('--manifest', action='store_true', help='manifest.json에 빠진 항목 추가')
    ap.add_argument('--json', metavar='FILE')
    args = ap.parse_args()

    mpath = os.path.join(args.dir, 'manifest.json')
    manifest = json.load(open(mpath, encoding='utf-8')) if os.path.exists(mpath) else {'assets': []}
    by_file = {e.get('file'): e for e in manifest.get('assets', [])}
    by_id = {os.path.splitext(e.get('file', ''))[0]: e for e in manifest.get('assets', [])}
    files = args.files or sorted((f for f in os.listdir(args.dir) if f.lower().endswith('.png')),
                                 key=lambda f: (split_stem(os.path.splitext(f)[0])[0], f.count('_attack') + f.count('_np')))
    paths = [f if os.path.isabs(f) or os.path.exists(f) and os.sep in f else os.path.join(args.dir, f) for f in files]

    report, added, total_e, total_w = [], [], 0, 0
    raw_basic = {}
    for p in paths:
        if not os.path.exists(p):
            print(f'✕ {p}: 파일이 없습니다'); total_e += 1; continue
        stem0, suf = split_stem(os.path.splitext(os.path.basename(p))[0])
        res, a = check_file(p, by_file.get(os.path.basename(p)) if not suf else by_id.get(stem0))
        if suf and res.get('raw0') and raw_basic.get(stem0):
            rb = raw_basic[stem0]
            if abs(res['raw0'] - rb) > max(10, rb * 0.12):
                res['warnings'].append(f'첫 칸 인물 높이 {res["raw0"]}px가 기본 시트 대기 칸({rb}px)과 다릅니다. 큰 칸에서도 인물은 같은 크기여야 합니다(무기·이펙트 포함 값이라 참고용)')
        elif not suf and res.get('raw0'):
            raw_basic[stem0] = res['raw0']
        report.append(res)
        total_e += len(res['errors']); total_w += len(res['warnings'])
        mark = '✕' if res['errors'] else '△' if res['warnings'] else '○'
        print(f'\n{mark} {res["file"]}  ({ {"servant": "서번트", "master": "마스터", "base": "일반인"}.get(res["kind"], "?") })')
        for m in res['errors']: print('   오류  ' + m)
        for m in res['warnings']: print('   주의  ' + m)
        for m in res['info']: print('   참고  ' + m)
        stem = os.path.splitext(res['file'])[0]
        if args.sheet:
            os.makedirs(args.sheet, exist_ok=True)
            draw_sheet(res, a, os.path.join(args.sheet, stem + '_check.png'))
        if args.fix:
            os.makedirs(args.fix, exist_ok=True)
            fix_copy(a, os.path.join(args.fix, res['file']))
        if args.manifest and res['file'] not in by_file and res['kind'] and not suf:
            exp, _ = expected_body(stem, res['kind'])
            e = default_entry(stem, res['kind'], a.shape[1], a.shape[0], exp)
            manifest.setdefault('assets', []).append(e); by_file[res['file']] = e; added.append(res['file'])

    if added:
        json.dump(manifest, open(mpath, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
        print(f'\nmanifest.json에 {len(added)}개 항목을 추가했습니다: {", ".join(added)} (name·revision은 직접 고쳐 주세요)')
    if args.json:
        json.dump(report, open(args.json, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f'\n합계: 파일 {len(report)}개 · 오류 {total_e} · 주의 {total_w}')
    sys.exit(1 if total_e else 0)


if __name__ == '__main__':
    main()
