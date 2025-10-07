import { AxiosError } from "axios";
import { logger } from "../utils/logger";

export const handleAxiosError = (error: AxiosError) => {
  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    logger.error("Axios Error Response", {
      url: error.response.config.url,
      status: error.response.status,
      data: error.response.data,
      // Note: headers/data will be sanitized by logger
    });
    throw error;
  } else if (error.request) {
    // The request was made but no response was received
    logger.error("Axios Error: No response received", {
      message: error.message,
    });
    throw error;
  } else {
    logger.error("Axios Error:", error.message);
    throw error;
  }
};
