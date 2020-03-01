const axios = require("axios");

/*
  question schema:{
    question:string,
    A:string,
    B:string,
    C:string,
    D:string,
    answer:string(A,B,C,D)
  }
*/
async function checkDb() {
  const url = `https://opentdb.com/api.php?amount=1&category=15`;
  let response = await axios.get(url);
  let response_code = response.data.response_code;
  return response_code == 0;
}
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
async function getQuestions(amount = 15) {
  const url = `https://opentdb.com/api.php?amount=${amount}&category=15&difficulty=easy&type=multiple&encode=url3986`;
  let response = await axios.get(url);
  response = response.data.results;
  let results = [];
  for (let q of response) {
    let x = [q.correct_answer, ...q.incorrect_answers];
    shuffle(x);
    let answer = String.fromCharCode(65 + x.indexOf(q.correct_answer));
    let newQ = {
      question: decodeURIComponent(q.question),
      A: decodeURIComponent(x[0]),
      B: decodeURIComponent(x[1]),
      C: decodeURIComponent(x[2]),
      D: decodeURIComponent(x[3]),
      answer
    };
    results.push(newQ);
  }
  return results;
}

async function getCategory() {
  let url = "https://opentdb.com/api_category.php";
  let response = await axios.get(url);
  response = response.data.trivia_categories;
  return response;
}
module.exports = {
  getQuestions,
  checkDb,
  getCategory
};