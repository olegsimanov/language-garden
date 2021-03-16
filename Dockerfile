FROM nginx

ARG APP_TYPE

RUN rm /usr/share/nginx/html/index.html
COPY app-${APP_TYPE} /usr/share/nginx/html

ARG VERSIONMIN
RUN sed -i "s/main.js?v=[[:digit:]]/main.js?v=${VERSIONMIN}/" /usr/share/nginx/html/index.html