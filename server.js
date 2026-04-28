const express = require('express');
const axios = require('axios');
const mongoose = require('mongoose');

const app = express();
const port = process.env.PORT || 10000;

app.use(express.json());

app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept'
  );
  next();
});

// 서버 접속 확인용
app.get('/', (req, res) => {
  res.send('flowerflower63 server is running');
});

// MongoDB 연결
const dbUri = process.env.DB_URI;

if (!dbUri) {
  console.error('DB_URI 환경변수가 설정되지 않았습니다.');
} else {
  mongoose
    .connect(dbUri)
    .then(() => console.log('MongoDB connected'))
    .catch((error) => console.error('MongoDB connection error:', error));
}

const flowerSchema = new mongoose.Schema({
  flowername: String,
  habitat: String,
  binomialName: String,
  classification: String,
  flowername_kr: String,
});

const Flower = mongoose.model('Flower', flowerSchema, 'flowers');

// 꽃 정보 조회 API
app.get('/flowers', async (req, res) => {
  const flowername = req.query.flowername;

  if (!flowername) {
    return res.status(400).json({ error: 'Flowername is required' });
  }

  try {
    const flower = await Flower.findOne({
      $or: [{ flowername: flowername }, { flowername_kr: flowername }],
    });

    if (!flower) {
      return res.status(404).json({ error: 'Flower not found' });
    }

    const {
      flowername: name,
      habitat,
      binomialName,
      classification,
      flowername_kr,
    } = flower;

    res.json({
      flowername: name,
      habitat,
      binomialName,
      classification,
      flowername_kr,
    });
  } catch (error) {
    console.error('Error retrieving flower information:', error);
    res.status(500).json({ error: 'An error occurred' });
  }
});

// 네이버 쇼핑 검색 API
app.get('/naver-shopping', async (req, res) => {
  const flowername = req.query.flowername;

  if (!flowername) {
    return res.status(400).json({ error: 'Flowername is required' });
  }

  const clientId = process.env.CLIENT_ID;
  const clientSecret = process.env.CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: 'Naver API credentials are missing' });
  }

  const displayPerPage = 100;
  const maxResults = 1000;
  let start = 1;

  try {
    const allResults = [];

    while (start <= maxResults) {
      const apiUrl = `https://openapi.naver.com/v1/search/shop.json?query=${encodeURIComponent(
        flowername
      )}&display=${displayPerPage}&start=${start}&sort=sim`;

      const response = await axios.get(apiUrl, {
        headers: {
          'X-Naver-Client-Id': clientId,
          'X-Naver-Client-Secret': clientSecret,
        },
      });

      const items = response.data.items || [];

      if (items.length === 0) {
        break;
      }

      allResults.push(...items);
      start += displayPerPage;
    }

    console.log(`총 ${allResults.length}개의 검색 결과를 가져왔습니다.`);
    res.json({ items: allResults });
  } catch (error) {
    console.error('네이버 쇼핑 API 오류:', error);
    res.status(500).json({ error: 'Naver Shopping API error' });
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on port ${port}`);
});
