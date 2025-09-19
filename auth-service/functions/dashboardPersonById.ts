import type { HandlerEvent, HandlerContext, Handler } from "@netlify/functions";
import { validate } from "./middleware/validateCookies";
import { request, gql } from "graphql-request";

const getPersonById = async (apiKey: string, personId: string) => {
  return request({
    url: "https://dashboard-api.mavenmm.com/graphql/",
    document: gql`
      query GetPersonById($personId: String!) {
        personById(id: $personId) {
          id
          avatar_url
          is_deleted_on_tw
          title
          team {
            id
            teamName
          }
          role {
            id
            roleTitle
          }
        }
      }
    `,
    requestHeaders: {
      "x-api-key": apiKey, // teamwork api token
    },
    variables: {
      personId,
    },
  })
    .then((res: any) => res.personById)
    .catch((err) => {
      console.log(err);
      throw Error(err);
    });
};

const handler: Handler = async (event: HandlerEvent, _: HandlerContext) => {
  const { status, code, message, options } = validate(event?.headers?.cookie);
  // Reject request if jwt is invalid
  if (status === "Invalid" || !options)
    return { statusCode: code, body: `Bad request: ${message}` };

  const apiKey = options.headers.Authorization.split(" ")[1];

  if (event.httpMethod === "GET") {
    // Get personId from query parameters
    const personId = event.queryStringParameters?.id;

    if (!personId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "Person ID is required",
        }),
      };
    }

    // Get person by ID from the database
    try {
      const response = await getPersonById(apiKey, personId);
      // console.log("response", response);
      return {
        statusCode: 200,
        body: JSON.stringify(response),
      };
    } catch (err) {
      console.log("error", err);
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "Error occurred while fetching person by ID",
        }),
      };
    }
  }

  // Return error for non-GET requests
  return { statusCode: 400, body: "Bad request" };
};

export { handler };
