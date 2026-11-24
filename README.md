# juni4268.github.io

작품의 제목, 대표 이미지, 기술과 담당 역할은 `_tools/projects.json`에서 관리합니다.
작품을 추가하거나 수정한 뒤 저장소에서 `node _tools/render-projects.mjs`를 실행하면
전체 작품 목록과 기본 상세 페이지가 생성됩니다.

직접 작성한 상세 페이지가 있는 작품은 `customDetail: true`를 지정합니다.
이 경우 생성기는 작품 목록을 갱신하고 해당 상세 페이지는 건너뜁니다.
