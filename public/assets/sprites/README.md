# 랜서17종·세이버13종 잘림 복원 및 카르나 방어 수정 · 2026-10-21

30종의 최신 기본·공격·보구 시트90장을 반영했습니다. 몸 키·축척과 발 기준선(기본240px,공격·보구496px),동작 순서와 재생 시간은 유지합니다.

- 주요8종(알테라·카르나·레오니다스·퍼시벌·로물루스·카이니스·엘리자베스·돈 키호테): 칸 경계에 잘린 무기·망토·머리카락·몸을 자세와 무기 각도 조정으로 복원했습니다.
- 그 외 검·창끝 접촉은 칸 안쪽으로 옮겼습니다. 라마 보구의 검끝과 불꽃도 완성된 형태로 복원했습니다.
- 카르나 방어2번째 동작(기본 시트0부터 세어7번)은 창대·태양 장식·칼날의 중심축을 한 직선으로 정렬했습니다.
- 대기 수정은 공격·보구 첫/마지막 칸에도 연결했습니다. 무사시 이도류 공격v4 등 나머지 승인된 중간 동작은 유지합니다.
- 기본1536×512(256px칸6×2),공격·보구각1536×1024(512px칸3×2). 알파0/255,칼·창·망토·이펙트는 칸 가장자리8px 안쪽입니다.
- 게임 PNG90장의 크기·투명도·여백·동작 연결을 검사했습니다. 주요 잘림은 확대 비교로 형태도 확인했습니다.
- 나머지74종의 캐릭터 정보와 게임 코드는 유지합니다. manifest.json에 최신 revision을 반영했습니다.

| ID | 대상 | 최신 revision |
|---|---|---|
|scathach|스카사하 · 랜서|servants-uncropped-v5|
|cuchulainn|쿠 훌린 · 랜서|servants-uncropped-v5|
|hector|헥토르 · 랜서|servants-uncropped-v5|
|leonidas|레오니다스 · 랜서|servants-uncropped-v5|
|diarmuid|디어뮈드 · 랜서|servants-uncropped-v5|
|karna|카르나 · 랜서|karna-straight-guard-v6|
|vlad|블라드 3세 · 랜서|servants-uncropped-v5|
|elizabeth|엘리자베스 · 랜서|servants-uncropped-v5|
|enkidu|엘키두 · 랜서|servants-uncropped-v5|
|romulus|로물루스 · 랜서|servants-uncropped-v5|
|brynhild|브륀힐드 · 랜서|servants-uncropped-v5|
|qinliangyu|진양옥 · 랜서|servants-uncropped-v5|
|fionn|핀 막 쿨 · 랜서|servants-uncropped-v5|
|caenis|카이니스 · 랜서|servants-uncropped-v5|
|quixote|돈 키호테 · 랜서|servants-uncropped-v5|
|percival|퍼시벌 · 랜서|servants-uncropped-v5|
|kagetora|카게토라 · 랜서|servants-uncropped-v5|
|artoria|알트리아 펜드래곤 · 세이버|servants-uncropped-v5|
|sigurd|시구르드 · 세이버|servants-uncropped-v5|
|siegfried|지크프리트 · 세이버|servants-uncropped-v5|
|nero|네로 클라우디우스 · 세이버|servants-uncropped-v5|
|gawain|가웨인 · 세이버|servants-uncropped-v5|
|mordred|모드레드 · 세이버|servants-uncropped-v5|
|altera|알테라 · 세이버|servants-uncropped-v5|
|charlemagne|샤를마뉴 · 세이버|servants-uncropped-v5|
|bedivere|베디비어 · 세이버|servants-uncropped-v5|
|okita|오키타 소지 · 세이버|servants-uncropped-v5|
|musashi|미야모토 무사시 · 세이버|servants-uncropped-v5|
|rama|라마 · 세이버|servants-uncropped-v5|
|richard|리처드 1세 · 세이버|servants-uncropped-v5|

## 이전 구성과 작업 기록

# 캐릭터 104종 · 마스터65종·서번트31종·일반인8종

## 랜서17종·세이버13종 최신 애니메이션 · 2026-10-21

랜서와 세이버 30종을 새 작업서의 기본·공격·보구 3장 구성으로 갱신했습니다. PNG 총90장, 캐릭터당24칸, 총720칸입니다. 아래30종을 제외한 기존 캐릭터74종과 색 교체 자료는 그대로 유지했습니다.

| 시트 | 크기 | 칸·배치 | 칸 수 | 발바닥 위치 |
|---|---|---|---:|---:|
| {id}.png |1536×512|256×256,6열×2행|12|240px|
| {id}_attack.png |1536×1024|512×512,3열×2행|6|496px|
| {id}_np.png |1536×1024|512×512,3열×2행|6|496px|

- 인물은 세 장에서 같은 축척입니다. 배경은 투명, 알파0/255, 모든 그림과 무기·이펙트는 칸 가장자리8px 안쪽입니다. 최근접 보간으로 표시하세요.
- 기본 칸: 대기4칸 / 피격2칸 / 회피 / 방어 / 휘청 / 넘어짐 / 접지 / 누움. 공격: 준비 / 무기 들기·조준 / 베기·찌르기 / 마무리 / 복귀 / 대기. 보구: 준비 / 충전 / 최대충전 / 해방 / 마무리 / 대기.
- manifest.json에는 캐릭터당 항목 하나만 둡니다. 공격·보구는 해당 항목의 actions.attack 및 actions.ultimate에 file과cell:512를 지정합니다. 기본 동작도 file과cell:256을 명시했습니다. 별도 공격 캐릭터 ID를 만들지 않습니다.
- 프레임 좌표: columns=1536/cell, x=(frame%columns)*cell, y=Math.floor(frame/columns)*cell. 게임에서 actions의file·cell·frames·durationMs를 읽어 재생합니다. down.holdLast:true는 마지막 칸을 유지합니다.
- 대기는0→1→2→3→2→1, 각400ms이며 좌우로 늘리지 않습니다. 공격·보구의 첫/마지막 칸은 같은 대기입니다.
- 세이버: 보구4번 검광을 잘림 없이 복원하고 발사광을 정면에 배치했습니다. 일반 공격의 중복 검광을 제거했으며, 가웨인·베디비어의 공격2번·5번 여분 팔·검을 수정했습니다. 무사시는 최신v4로 공격2번 양손 들기, 3·4번 두 칼 내리치기·뒤쪽 칼 제거·연속 검광을 반영했습니다.
- 랜서: 승인된3장 구성과 찌르기 동작, 캐릭터별 무기·의상·방향 수정본입니다. 원본4px 격자의 몸 키 반올림은 유지합니다. 예: 스카사하 작업서 약134px/실측136px. bodyPx는 실제 기본 시트의 승인된 값입니다.
- 기존 랜슬롯 등 다른 클래스는 이전 규격을 유지하므로 각 manifest 항목의 크기·동작을 사용하세요. 저장소 게임 코드 변경은 포함하지 않습니다.

| ID | 대상 | 몸 키(px) | 기준(px) | 최신 revision |
|---|---|---:|---:|---|
|scathach|스카사하 · 랜서|136|134|scathach-three-sheet-v1|
|cuchulainn|쿠 훌린 · 랜서|148|148|lancers-three-sheet-v1|
|hector|헥토르 · 랜서|144|144|lancers-three-sheet-v1|
|leonidas|레오니다스 · 랜서|150|150|lancers-three-sheet-v1|
|diarmuid|디어뮈드 · 랜서|147|147|lancers-three-sheet-v1|
|karna|카르나 · 랜서|142|142|lancers-three-sheet-v1|
|vlad|블라드 3세 · 랜서|153|153|lancers-three-sheet-v1|
|elizabeth|엘리자베스 · 랜서|123|123|lancers-three-sheet-v1|
|enkidu|엘키두 · 랜서|136|136|lancers-three-sheet-v1|
|romulus|로물루스 · 랜서|152|152|lancers-three-sheet-v1|
|brynhild|브륀힐드 · 랜서|138|138|lancers-three-sheet-v1|
|qinliangyu|진양옥 · 랜서|133|133|lancers-three-sheet-v1|
|fionn|핀 막 쿨 · 랜서|145|145|lancers-three-sheet-v1|
|caenis|카이니스 · 랜서|139|139|lancers-three-sheet-v1|
|quixote|돈 키호테 · 랜서|118|118|lancers-three-sheet-v1|
|percival|퍼시벌 · 랜서|156|156|lancers-three-sheet-v1|
|kagetora|카게토라 · 랜서|134|134|lancers-three-sheet-v1|
|artoria|알트리아 펜드래곤 · 세이버|123|123|sabers-three-sheet-v3|
|sigurd|시구르드 · 세이버|142|142|sabers-three-sheet-v3|
|siegfried|지크프리트 · 세이버|152|152|sabers-three-sheet-v3|
|nero|네로 클라우디우스 · 세이버|120|120|sabers-three-sheet-v3|
|gawain|가웨인 · 세이버|144|144|sabers-three-sheet-v3|
|mordred|모드레드 · 세이버|123|123|sabers-three-sheet-v3|
|altera|알테라 · 세이버|128|128|sabers-three-sheet-v3|
|charlemagne|샤를마뉴 · 세이버|141|141|sabers-three-sheet-v3|
|bedivere|베디비어 · 세이버|150|150|sabers-three-sheet-v3|
|okita|오키타 소지 · 세이버|126|126|sabers-three-sheet-v3|
|musashi|미야모토 무사시 · 세이버|134|134|musashi-two-sword-attack-v4|
|rama|라마 · 세이버|134|134|sabers-three-sheet-v3|
|richard|리처드 1세 · 세이버|142|142|sabers-three-sheet-v3|

## 이전 작업 기록

아래는 이전 업로드 당시의 구성과 변경 이력입니다. 위30종에는 현재의3장 규격과 manifest.json이 우선합니다.

# 마스터 65종·서번트 15종·일반인 8종 · 큰 도트 애니메이션

작업 가이드: https://claude.ai/artifact/TFCPss31cF7vH5PSeZW9tN

큰 사각 픽셀과 약 2등신 데포르메를 유지한 캐릭터 88종입니다. 마스터 65종·서번트 15종·색 교체용 일반인 기본형 8종을 포함합니다. 기존 마스터의 반대 성별 외형 수정과 여성 점술가의 수염 제거본도 포함합니다. 여성 캐릭터는 6개 동작 모두 수염·콧수염·턱수염 자국이 없는 얼굴로 제작했습니다.

## 공통 규격

- RGBA PNG, 한 칸 256×256px, 6열, 칸 사이 여백 없음.
- 마스터는 1536×256px, 6칸: 대기 / 호흡 / 놀람 / 손등 령주 / 다침 / 쓰러짐.
- 이번 수정 마스터 32종은 투명도 0/255, 가장자리 8px 여백, 발바닥 y240 기준을 검사했습니다.
- 대기 첫 칸 몸 키는 일반 남성 140px·여성 130px, 천재 마술사는 남녀 모두 120px입니다. 높은 모자 등 별도 장식은 몸 키에서 제외합니다.
- 이번 추가 31종의 대기와 호흡은 머리 높이가 한 블록(6px) 다릅니다.
- 부드럽게 보간하지 말고 최근접 보간으로 표시합니다.

## 재생 정보

manifest.json의 actions에는 0부터 시작하는 프레임 번호와 재생 시간(ms), holdLast가 들어 있습니다. 프레임 위치는 x=(frame%6)*256, y=Math.floor(frame/6)*256입니다. 쓰러짐은 마지막 칸을 유지합니다. 마스터는 캐릭터당 총 6개 포즈를 사용하며 각 동작에 별도 중간 그림을 추가한 구성은 아닙니다.

서번트는 1536×1024px, 6×4 배치의 24프레임입니다. 1행은 공격, 2행은 피격·회피·방어, 3행은 보구, 4행은 쓰러짐입니다. 대기는 0→5→6→11→6→5 순서로 각 400ms씩 반복하며 호흡과 장식 움직임을 표현합니다. 란슬롯은 검을 계속 들고 뒤로 쓰러지고, 쿠훌린은 붉은 창을 유지합니다. 마지막 두 칸은 동일한 정지 자세입니다. 서번트 bodyPx는 란슬롯 153px, 쿠훌린 148px입니다.

## 이번 추가·수정 32종

31종의 revision은 block-pixel-opposite-master-guide-02이며, 여성 점술가는 block-pixel-fortune-female-clean-face-01입니다. m_prodigy_m.png의 기존 120px 수정본과 그 외 기존 리소스·재생 설정은 보존했습니다.

| 파일 | 대상 | bodyPx | 변경 |
|---|---|---:|---|
| m_heir_m.png | 명문의 후계자 · 남성 | 140 | 추가 |
| m_exec_f.png | 봉인지정 집행자 · 여성 | 130 | 추가 |
| m_elder_m.png | 늙은 연구자 · 남성 | 140 | 추가 |
| m_student_m.png | 우연히 령주를 받은 대학생 · 남성 | 140 | 추가 |
| m_avenger_f.png | 복수를 원하는 몰락 가문의 막내 · 여성 | 130 | 추가 |
| m_merc_m.png | 바다 건너온 용병 마술사 · 남성 | 140 | 추가 |
| m_veteran_f.png | 지난 전쟁의 생존자 · 여성 | 130 | 추가 |
| m_detective_m.png | 연쇄 사건을 쫓는 형사 · 남성 | 140 | 추가 |
| m_collector_f.png | 성유물을 모으는 부호 · 여성 | 130 | 추가 |
| m_cultist_m.png | 성배를 숭배하는 교단의 교주 · 남성 | 140 | 추가 |
| m_prodigy_f.png | 12살 천재 마술사 · 여성 | 120 | 추가 |
| m_artist_m.png | 영감을 찾는 화가 · 남성 | 140 | 추가 |
| m_executor_f.png | 성당교회의 대행자 · 여성 | 130 | 추가 |
| m_eighth_f.png | 제8비적회의 성유물 회수관 · 여성 | 130 | 추가 |
| m_atlas_m.png | 아틀라스원의 연금술사 · 남성 | 140 | 추가 |
| m_lord_f.png | 시계탑 귀족주의파의 젊은 군주 · 여성 | 130 | 추가 |
| m_democrat_m.png | 시계탑 민주주의파의 신진 마술사 · 남성 | 140 | 추가 |
| m_wanderer_f.png | 방랑해에서 온 마술사 · 여성 | 130 | 추가 |
| m_apostle_m.png | 사람의 피를 마시는 사도 · 남성 | 140 | 추가 |
| m_killer_f.png | 프리랜서 마술사 사냥꾼 · 여성 | 130 | 추가 |
| m_exorcist_m.png | 퇴마 가문의 후계자 · 남성 | 140 | 추가 |
| m_flunk_f.png | 시계탑의 만년 낙제생 · 여성 | 130 | 추가 |
| m_fortune_m.png | 길거리 점술가 · 남성 | 140 | 추가 |
| m_streamer_f.png | 오컬트 방송인 · 여성 | 130 | 추가 |
| m_stage_m.png | 무대 마술사 · 남성 | 140 | 추가 |
| m_inlaw_f.png | 데릴사위로 들어온 마술사 · 여성 | 130 | 추가 |
| m_antique_m.png | 빚에 쫓기는 골동품상 · 남성 | 140 | 추가 |
| m_amnesia_f.png | 기억을 잃은 사람 · 여성 | 130 | 추가 |
| m_exile_m.png | 고향을 잃은 망명 마술사 · 남성 | 140 | 추가 |
| m_lecturer_f.png | 은퇴한 시계탑 강사 · 여성 | 130 | 추가 |
| m_kendo_m.png | 고교 검도부 주장 · 남성 | 140 | 추가 |
| m_fortune_f.png | 길거리 점술가 · 여성 | 130 | 수정 |

저장소 리소스 경로는 public/assets/sprites/입니다. 이번 커밋은 위 PNG 32장과 manifest.json, 이 README만 추가·수정합니다. 애니메이션 재생 정보까지 포함하며 게임 코드에서의 캐릭터 선택·동작 연결은 별도 작업입니다. 생성 원본·재생 미리보기·프롬프트는 전달 패키지에 포함됩니다.

## 무대 마술사·남성 점술가 크기 및 외형 수정

`m_stage_m.png`는 기존 연미복·실크햇·붉은 나비넥타이·마술봉 디자인을 유지하면서 후계자 남성 기준으로 머리·어깨·몸 크기를 조정한 `block-pixel-stage-scale-03` 버전입니다. 모자를 제외한 몸 키는 140px이며 실크햇은 그 위에 놓입니다.

`m_fortune_m.png`는 여성 짝의 자줏빛 숄·구슬 장신구·타로 카드만 참고하여 별개 인물로 재작화한 `block-pixel-fortune-distinct-male-03` 버전입니다. 50대 남성, 검은 묶음머리·짧은 턱수염·헐렁한 초록 바지·낡은 신발을 사용합니다. 몸 키는 140px입니다.

두 파일 모두 1536×256px, 256×256 칸 6개이며 대기/호흡/놀람/손등 령주/다침/쓰러짐 순서를 유지합니다. 대기와 호흡은 머리·어깨가 한 블록(6px) 다릅니다. 투명도 0/255, 발바닥 y240, 가장자리 8px 여백을 검사했습니다. 재생 정보는 기존 전체 manifest의 해당 두 ID만 갱신했습니다.

## 색 교체용 일반인 기본형 8종

각 파일은 1536×256px, 256×256 칸 6개이며 대기 / 호흡 / 놀람 / 빛 없이 한 손 들기 / 다침 / 쓰러짐 순서입니다. 손 들기에는 령주나 마법 효과가 없습니다. 모든 칸은 투명도 0/255, 발바닥 마지막 픽셀 y240, 가장자리 8px 여백 기준입니다. 대기와 호흡은 머리·어깨 높이가 6px 다릅니다.

| 파일 | 대상 | 몸 키 |
|---|---|---:|
| base_m_child.png | 남자 아이 | 96px |
| base_f_child.png | 여자 아이 | 96px |
| base_m_young.png | 20대 남성 | 140px |
| base_f_young.png | 20대 여성 | 130px |
| base_m_adult.png | 40대 남성 | 140px |
| base_f_adult.png | 40대 여성 | 130px |
| base_m_elder.png | 70대 남성 | 140px |
| base_f_elder.png | 70대 여성 | 130px |

머리는 무채색 회색, 상의의 모든 레이어는 초록, 하의는 파랑으로 분리했습니다. 머리·옷은 3~4단계 명암을 사용합니다. 피부·입·검은 점 눈·갈색 신발·윤곽선은 고정 색입니다. 여자 아이만 원피스 전체를 초록으로 사용하며 파랑 하의 부위가 없습니다.

정확한 RGB 목록은 civilian-palette.json에 있으며 hair / upper / lower 세 그룹은 서로 겹치지 않습니다. 각 캐릭터 manifest 항목의 recolor.paletteFile과 recolor.maskFile은 이 자료의 위치를 가리킵니다. civilian-masks/의 같은 이름 PNG는 빨강=머리, 초록=상의, 파랑=하의를 표시하며 고정 색 부위는 투명합니다. 마스크는 캐릭터 그림을 대신하는 파일이 아닙니다. 색상 목록 또는 마스크 중 필요한 방식으로 색을 바꿀 수 있습니다.

동작 정보는 manifest.json의 actions에 있습니다. 손 들기 이름은 raiseHand입니다. 이번 변경은 일반인 PNG 8장과 부위 구분 PNG 8장, 색상표, manifest.json, 이 문서만 추가·수정합니다. 게임 내 일반인 선택·동작 연결·색 교체 로직은 별도 적용이 필요합니다. 생성 원본·재생 미리보기·프롬프트는 전달 패키지에 포함됩니다.


## 세이버 13종 추가 · 2026-10-20

알트리아의 승인된 도트 스타일을 기준으로 맞춘 최신 세이버 13종입니다. 각 PNG는 1536×1024px, 256×256px 칸 6열×4행의 24칸이며 가장자리 여백 8px, 불투명/투명 픽셀만 사용합니다. 대기 첫 칸 몸 키는 아래와 같고, 서 있는 동작의 발 위치는 y240입니다. 동작 배치와 재생 시간은 manifest.json의 actions를 사용합니다.

| 파일 | 대상 | bodyPx | revision |
|---|---|---:|---|
| artoria.png | 알트리아 펜드래곤 · 세이버 | 123 | artoria-dense-gold-effects-04 |
| sigurd.png | 시구르드 · 세이버 | 142 | saber-artoria-style-match-06 |
| siegfried.png | 지크프리트 · 세이버 | 152 | saber-artoria-style-match-06 |
| nero.png | 네로 클라우디우스 · 세이버 | 120 | saber-artoria-style-match-06 |
| gawain.png | 가웨인 · 세이버 | 144 | saber-artoria-style-match-06 |
| mordred.png | 모드레드 · 세이버 | 123 | saber-artoria-style-match-06 |
| altera.png | 알테라 · 세이버 | 128 | saber-artoria-style-match-06 |
| charlemagne.png | 샤를마뉴 · 세이버 | 141 | saber-artoria-style-match-06 |
| bedivere.png | 베디비어 · 세이버 | 150 | saber-artoria-style-match-06 |
| okita.png | 오키타 소지 · 세이버 | 126 | saber-artoria-style-match-06 |
| musashi.png | 미야모토 무사시 · 세이버 | 134 | musashi-anatomy-08 |
| rama.png | 라마 · 세이버 | 134 | saber-artoria-style-match-06 |
| richard.png | 리처드 1세 · 세이버 | 142 | richard-artoria-gold-effects-09 |

무사시는 회피·방어·보구 2~5번째 동작의 팔·손·검 중복을 수정한 v8입니다. 리처드 1세는 일반 공격·보구의 6칸을 알트리아와 유사한 금빛/흰빛 곡선 궤적으로 교체한 v9입니다. 알트리아는 승인된 금빛 이펙트 v4를 그대로 사용했습니다. 베디비어의 팔·검 소유, 알테라의 검 세로 색 구분, 지크프리트·무사시·가웨인의 참고 외형 수정을 포함합니다.

이번 추가는 이 폴더의 세이버 PNG 13장, 기존 75종 항목을 보존해 합친 manifest.json과 이 문서만 변경합니다. 게임 코드는 수정하지 않습니다.

