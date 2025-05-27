import { AxiosError } from "axios";

// Define colour codes that will show in terminal
const red = "\x1b[31m";
const yellow = "\x1b[33m";
const reset = "\x1b[0m";

export const handleAxiosError = (error: AxiosError) => {
  // Log the error in red colour
  console.group("Axios Error");
  //console.error("Config:", error.config);

  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    console.error(red, "Error Response", reset);
    console.error(yellow, "Request:", error.response.config.url);
    console.error(yellow, "Config:", error.response.config.data);
    console.error(yellow, "Data:", error.response.data);
    console.error(yellow, "Status:", error.response.status, reset);
    console.error(yellow, "Headers:", error.response.headers);
    console.groupEnd();
    throw error;
  } else if (error.request) {
    // The request was made but no response was received
    console.log("The request was made but no response was received");
    console.log(error.toJSON());
    console.groupEnd();
    throw error;
  } else {
    console.error("Message:", error.message);
    console.groupEnd();
    throw error;
  }
};
