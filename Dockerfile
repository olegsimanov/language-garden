FROM nginx

RUN rm /usr/share/nginx/html/index.html
COPY app /usr/share/nginx/html

ARG VERSIONMIN
RUN sed -i "s/main.js?v=[[:digit:]]/main.js?v=${VERSIONMIN}/" /usr/share/nginx/html/index.html