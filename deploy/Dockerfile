FROM node:6

WORKDIR /app

COPY config config
COPY package.json .
COPY src src
COPY .babelrc .
COPY .eslintignore .
COPY .eslintrc .

RUN npm install

CMD npm start
