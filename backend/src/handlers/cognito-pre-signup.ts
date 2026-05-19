import { PreSignUpTriggerEvent } from 'aws-lambda';

export const handler = async (event: PreSignUpTriggerEvent): Promise<PreSignUpTriggerEvent> => {
  event.response.autoConfirmUser = true;

  if (event.request.userAttributes?.email) {
    event.response.autoVerifyEmail = true;
  }

  return event;
};

