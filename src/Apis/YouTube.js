import axios from "axios";

const KEY = "AIzaSyBammkB4YZ1NfP7PG9T0_JGCi9Sh3ob87M";

export default axios.create({
  baseURL: "https://www.googleapis.com/youtube/v3",
  params: {
    part: "snippet",
    type: "video",
    maxResults: 5,
    key: KEY,
  },
});
