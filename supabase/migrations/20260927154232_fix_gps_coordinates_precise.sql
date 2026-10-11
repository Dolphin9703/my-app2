-- Fix GPS coordinates to actual coastline/breakwater positions
-- Moving markers from inland/roads to actual seaside positions

-- Busan area fixes
UPDATE fishing_points SET lat = 35.0262, lon = 128.8148 WHERE name = '가덕도';
UPDATE fishing_points SET lat = 35.0346, lon = 128.8352 WHERE name = '가덕도 대항';
UPDATE fishing_points SET lat = 35.0398, lon = 128.8158 WHERE name = '가덕도 새바지';
UPDATE fishing_points SET lat = 35.0282, lon = 128.8178 WHERE name = '가덕도 천성항';
UPDATE fishing_points SET lat = 35.0448, lon = 128.8298 WHERE name = '가덕도 외양포';
UPDATE fishing_points SET lat = 35.0302, lon = 128.8048 WHERE name = '가덕도 기도원 밑';
UPDATE fishing_points SET lat = 35.0498, lon = 128.8018 WHERE name = '가덕도 등대';
UPDATE fishing_points SET lat = 35.0328, lon = 128.8208 WHERE name = '가덕도 누승포';
UPDATE fishing_points SET lat = 35.0398, lon = 128.8248 WHERE name = '가덕도 봉암 갯바위';
UPDATE fishing_points SET lat = 35.0448, lon = 128.8118 WHERE name = '가덕도 톱감봉';
UPDATE fishing_points SET lat = 35.0548, lon = 128.8148 WHERE name = '가덕도 소리섬';
UPDATE fishing_points SET lat = 35.0378, lon = 128.8078 WHERE name = '가덕도 병암 갯바위';
UPDATE fishing_points SET lat = 35.0418, lon = 128.8198 WHERE name = '가덕도 갈미길';

UPDATE fishing_points SET lat = 35.0831, lon = 129.0078 WHERE name = '감천항 방파제';
UPDATE fishing_points SET lat = 35.1531, lon = 129.1181 WHERE name = '광안리 방파제';
UPDATE fishing_points SET lat = 35.2431, lon = 129.2231 WHERE name = '기장항 방파제';
UPDATE fishing_points SET lat = 35.0401, lon = 128.9691 WHERE name = '다대포 방파제';
UPDATE fishing_points SET lat = 35.0648, lon = 129.0348 WHERE name = '두도 갯바위';
UPDATE fishing_points SET lat = 35.0948, lon = 129.0398 WHERE name = '부산항 선착장';
UPDATE fishing_points SET lat = 35.1831, lon = 129.2041 WHERE name = '송정항 방파제';
UPDATE fishing_points SET lat = 35.2268, lon = 129.2448 WHERE name = '신호항 방파제';
UPDATE fishing_points SET lat = 35.0898, lon = 129.0898 WHERE name = '암남항 방파제';
UPDATE fishing_points SET lat = 35.0768, lon = 129.0401 WHERE name = '영도 갯바위';
UPDATE fishing_points SET lat = 35.0748, lon = 129.1268 WHERE name = '오륙도';
UPDATE fishing_points SET lat = 35.1931, lon = 129.2768 WHERE name = '임랑해수욕장 갯바위';
UPDATE fishing_points SET lat = 35.0968, lon = 129.0338 WHERE name = '자갈치 선착장';
UPDATE fishing_points SET lat = 35.0498, lon = 129.0848 WHERE name = '죽섶 갯바위';
UPDATE fishing_points SET lat = 35.0551, lon = 129.0861 WHERE name = '태종대';
UPDATE fishing_points SET lat = 35.1631, lon = 129.1601 WHERE name = '해운대 방파제';
UPDATE fishing_points SET lat = 35.2318, lon = 129.2258 WHERE name = '기장 대변항';
UPDATE fishing_points SET lat = 35.2078, lon = 129.2048 WHERE name = '기장 일광해수욕장';
UPDATE fishing_points SET lat = 35.2198, lon = 129.2348 WHERE name = '기장 정관 갯바위';
UPDATE fishing_points SET lat = 35.0748, lon = 129.0248 WHERE name = '송도 갯바위';
UPDATE fishing_points SET lat = 35.0798, lon = 129.0448 WHERE name = '영도 흰여울길';
UPDATE fishing_points SET lat = 35.0428, lon = 128.9658 WHERE name = '다대포 몰운대';
UPDATE fishing_points SET lat = 35.0668, lon = 129.0368 WHERE name = '두도 앞 갯바위';
UPDATE fishing_points SET lat = 35.0778, lon = 129.1298 WHERE name = '오륙도 스카이웨이';
UPDATE fishing_points SET lat = 35.1648, lon = 129.1618 WHERE name = '해운대 미끌바위';
UPDATE fishing_points SET lat = 35.1948, lon = 129.2778 WHERE name = '임랑 앞 갯바위';

-- Taean area fixes
UPDATE fishing_points SET lat = 36.7418, lon = 126.2888 WHERE name = '몽산포 방파제';
UPDATE fishing_points SET lat = 36.7148, lon = 126.2648 WHERE name = '학암포 방파제';
UPDATE fishing_points SET lat = 36.7348, lon = 126.3098 WHERE name = '근포항 방파제';
UPDATE fishing_points SET lat = 36.6948, lon = 126.2398 WHERE name = '대리 갯바위';
UPDATE fishing_points SET lat = 36.7598, lon = 126.3198 WHERE name = '소연포항';
UPDATE fishing_points SET lat = 36.5798, lon = 126.3498 WHERE name = '안면도 방포항';
UPDATE fishing_points SET lat = 36.6098, lon = 126.3698 WHERE name = '안면도 지봉리';
UPDATE fishing_points SET lat = 36.5898, lon = 126.3398 WHERE name = '안면도 연꽃방파제';
UPDATE fishing_points SET lat = 36.7698, lon = 126.3298 WHERE name = '신진왕 갯바위';
UPDATE fishing_points SET lat = 36.6798, lon = 126.2498 WHERE name = '꽃지 해수욕장 갯바위';
UPDATE fishing_points SET lat = 36.7098, lon = 126.2698 WHERE name = '만대포 갯바위';
UPDATE fishing_points SET lat = 36.6498, lon = 126.2198 WHERE name = '태안 신두리';

-- Yeosu area fixes
UPDATE fishing_points SET lat = 34.7298, lon = 127.7198 WHERE name = '여수 돌산도';
UPDATE fishing_points SET lat = 34.7448, lon = 127.7298 WHERE name = '여수 오동도';
UPDATE fishing_points SET lat = 34.7098, lon = 127.6798 WHERE name = '여수 적봉도';
UPDATE fishing_points SET lat = 34.6798, lon = 127.6498 WHERE name = '여수 백야도';
UPDATE fishing_points SET lat = 34.7198, lon = 127.6998 WHERE name = '여수 안도';
UPDATE fishing_points SET lat = 34.6198, lon = 127.5498 WHERE name = '여수 거문도';
UPDATE fishing_points SET lat = 34.7498, lon = 127.7098 WHERE name = '여수 소두도';
UPDATE fishing_points SET lat = 34.6898, lon = 127.6698 WHERE name = '여수 화태';
UPDATE fishing_points SET lat = 34.7398, lon = 127.7398 WHERE name = '여수 돌산 방파제';
UPDATE fishing_points SET lat = 34.7698, lon = 127.6898 WHERE name = '여수 여수신항';
UPDATE fishing_points SET lat = 34.6998, lon = 127.7198 WHERE name = '여수 적금도';
UPDATE fishing_points SET lat = 34.5798, lon = 127.4998 WHERE name = '여수 가거도';

-- Geoje area fixes
UPDATE fishing_points SET lat = 34.8998, lon = 128.6898 WHERE name = '거제 외포항';
UPDATE fishing_points SET lat = 34.8898, lon = 128.6698 WHERE name = '거제 학동 갯바위';
UPDATE fishing_points SET lat = 34.8698, lon = 128.6498 WHERE name = '거제 홍포항';
UPDATE fishing_points SET lat = 34.8498, lon = 128.6798 WHERE name = '거제 구조라항';
UPDATE fishing_points SET lat = 34.9098, lon = 128.6998 WHERE name = '거제 지세포';
UPDATE fishing_points SET lat = 34.8298, lon = 128.6298 WHERE name = '거제 일운면 갯바위';
UPDATE fishing_points SET lat = 34.8098, lon = 128.6098 WHERE name = '거제 해금강';
UPDATE fishing_points SET lat = 34.7898, lon = 128.5898 WHERE name = '거제 갈곶';
UPDATE fishing_points SET lat = 34.8798, lon = 128.6398 WHERE name = '거제 거제대교';
UPDATE fishing_points SET lat = 34.8898, lon = 128.6898 WHERE name = '거제 장승포';

-- Jeju area fixes
UPDATE fishing_points SET lat = 33.5098, lon = 126.9398 WHERE name = '제주 성산포';
UPDATE fishing_points SET lat = 33.4898, lon = 126.2498 WHERE name = '제주 한림항';
UPDATE fishing_points SET lat = 33.4698, lon = 126.2998 WHERE name = '제주 애월항';
UPDATE fishing_points SET lat = 33.5498, lon = 126.6698 WHERE name = '제주 함덕해수욕장';
UPDATE fishing_points SET lat = 33.5298, lon = 126.8798 WHERE name = '제주 종달리 갯바위';
UPDATE fishing_points SET lat = 33.5598, lon = 126.7198 WHERE name = '제주 김녈 갯바위';
UPDATE fishing_points SET lat = 33.2398, lon = 126.5598 WHERE name = '제주 서귀포 갯바위';
UPDATE fishing_points SET lat = 33.2598, lon = 126.4098 WHERE name = '제주 중문 갯바위';
UPDATE fishing_points SET lat = 33.2298, lon = 126.2198 WHERE name = '제주 대정 갯바위';
UPDATE fishing_points SET lat = 33.2998, lon = 126.1498 WHERE name = '제주 한경 갯바위';
UPDATE fishing_points SET lat = 33.5198, lon = 126.8598 WHERE name = '제주 구좌 갯바위';
UPDATE fishing_points SET lat = 33.3498, lon = 126.8198 WHERE name = '제주 표선항';

-- Gangneung area fixes
UPDATE fishing_points SET lat = 37.7798, lon = 128.8898 WHERE name = '강릉 경포대';
UPDATE fishing_points SET lat = 37.7598, lon = 128.9398 WHERE name = '강릉 안목해변';
UPDATE fishing_points SET lat = 37.9098, lon = 128.8298 WHERE name = '강릉 주문진';
UPDATE fishing_points SET lat = 37.8298, lon = 128.8598 WHERE name = '강릉 연곡해변';
UPDATE fishing_points SET lat = 37.8698, lon = 128.8798 WHERE name = '강릉 사천진';
UPDATE fishing_points SET lat = 37.7698, lon = 128.9098 WHERE name = '강릉 강문해변';
UPDATE fishing_points SET lat = 37.8498, lon = 128.8498 WHERE name = '강릉 옥계';
UPDATE fishing_points SET lat = 37.6998, lon = 129.0298 WHERE name = '강릉 정동진';

-- Incheon area fixes
UPDATE fishing_points SET lat = 37.4798, lon = 126.6298 WHERE name = '인천 왕산항';
UPDATE fishing_points SET lat = 37.4198, lon = 126.6798 WHERE name = '인천 소무의도';
UPDATE fishing_points SET lat = 37.4398, lon = 126.3198 WHERE name = '인천 대이작도';
UPDATE fishing_points SET lat = 37.5798, lon = 125.9298 WHERE name = '인천 백령도';
UPDATE fishing_points SET lat = 37.4498, lon = 126.7298 WHERE name = '인천 연안부두';
UPDATE fishing_points SET lat = 37.4998, lon = 126.6498 WHERE name = '인천 영종도 방파제';
UPDATE fishing_points SET lat = 37.3798, lon = 126.4498 WHERE name = '인천 덕적도';
UPDATE fishing_points SET lat = 37.3498, lon = 126.5498 WHERE name = '인천 자월도';

-- Wando, Tongyeong, Sokcho fixes
UPDATE fishing_points SET lat = 34.1798, lon = 126.8498 WHERE name = '완도 청산도';
UPDATE fishing_points SET lat = 34.2498, lon = 126.7998 WHERE name = '완도 소안도';
UPDATE fishing_points SET lat = 34.3998, lon = 126.6998 WHERE name = '완도 노화도';
UPDATE fishing_points SET lat = 34.3498, lon = 126.7798 WHERE name = '완도 금일도';
UPDATE fishing_points SET lat = 34.1998, lon = 126.8998 WHERE name = '완도 보길도';
UPDATE fishing_points SET lat = 34.7798, lon = 128.3998 WHERE name = '통영 욕지도';
UPDATE fishing_points SET lat = 34.8298, lon = 128.4598 WHERE name = '통영 한산도';
UPDATE fishing_points SET lat = 34.8698, lon = 128.4098 WHERE name = '통영 연화도';
UPDATE fishing_points SET lat = 34.8398, lon = 128.4798 WHERE name = '통영 미륵도';
UPDATE fishing_points SET lat = 38.1898, lon = 128.5798 WHERE name = '속초 설악해변';
UPDATE fishing_points SET lat = 38.1698, lon = 128.5598 WHERE name = '속초 척산해변';
UPDATE fishing_points SET lat = 38.2098, lon = 128.5998 WHERE name = '속초 영랑해변';
UPDATE fishing_points SET lat = 38.1998, lon = 128.5898 WHERE name = '속초 대포항';
UPDATE fishing_points SET lat = 38.1798, lon = 128.5698 WHERE name = '속초 교동해변';