import { ensureChatChannel, type PreparedRentalChat } from "../../services/chat/chatService";
import usePaymentViewModel, {
  type PaymentAttemptOutcome,
} from "../payment/usePaymentViewModel";
import useRentalDetailData from "./useRentalDetailData";

export type RenterChatOutcome =
  | { status: "success"; chat: PreparedRentalChat }
  | { status: "failure"; message: string };

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export default function useRenterRentalDetailViewModel(rentalId: string) {
  const detail = useRentalDetailData(rentalId, "renter");
  const payment = usePaymentViewModel(rentalId);
  const isApproved = detail.rental?.status === "approved";
  const canPay =
    detail.isAuthorized &&
    isApproved &&
    !payment.isPaying &&
    !payment.isPaymentLoading &&
    !payment.isPaymentComplete &&
    !payment.paymentStatusError;

  const pay = async (): Promise<PaymentAttemptOutcome> => {
    if (!detail.isAuthorized || !detail.rental) {
      return { status: "failure", message: "You do not have access to pay for this rental." };
    }
    if (!isApproved) {
      return { status: "failure", message: "The rental must be approved before payment." };
    }
    return payment.pay();
  };

  const prepareChat = async (): Promise<RenterChatOutcome> => {
    if (!detail.isAuthorized || !detail.rental) {
      return { status: "failure", message: "You do not have access to this rental." };
    }
    if (!isApproved) {
      return { status: "failure", message: "Messaging is available after approval." };
    }

    try {
      return { status: "success", chat: await ensureChatChannel(detail.rental.id) };
    } catch (error) {
      return {
        status: "failure",
        message: getErrorMessage(error, "Could not synchronize the chat channel."),
      };
    }
  };

  return {
    ...detail,
    ...payment,
    isApproved,
    canPay,
    pay,
    prepareChat,
  };
}
