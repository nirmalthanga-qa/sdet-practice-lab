import { useContext, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { CartContext } from '../context/CartContext';
import type { CartTransferRequest } from '../api/cart';

function isTransfer(value: unknown): value is CartTransferRequest {
    return (
        typeof value === 'object' &&
        value !== null &&
        'transferId' in value &&
        typeof value.transferId === 'string' &&
        'items' in value &&
        Array.isArray(value.items) &&
        value.items.length > 0 &&
        value.items.every(
            (item) =>
                typeof item === 'object' &&
                item !== null &&
                'productId' in item &&
                typeof item.productId === 'string' &&
                'quantity' in item &&
                typeof item.quantity === 'number' &&
                Number.isSafeInteger(item.quantity) &&
                item.quantity > 0,
        )
    );
}

export default function GuestCartTransfer() {
    const { authState } = useAuth();

    if (authState.status !== 'authenticated') {
        return null;
    }

    return (
        <TransferBanner
            key={authState.user.id}
            userId={authState.user.id}
        />
    );
}

function TransferBanner({ userId }: { userId: string }) {
    const cart = useContext(CartContext);
    const busyRef = useRef(false);

    const [isWorking, setIsWorking] = useState(false);
    const [message, setMessage] = useState('');
    const [localError, setLocalError] = useState('');
    const [hasPendingTransfer, setHasPendingTransfer] = useState(() => {
        try {
            return localStorage.getItem(
                `sdet-guest-transfer-v1:${userId}`,
            ) !== null;
        } catch {
            return false;
        }
    });

    if (!cart || !cart.customerCart) {
        return null;
    }

    const {
        customerCart,
        guestCartItems,
        clearTransferredGuestCart,
        catalogueState,
        retryCatalogue,
    } = cart;

    const storageKey = `sdet-guest-transfer-v1:${userId}`;

    async function handleTransfer() {
        if (
            busyRef.current ||
            !customerCart ||
            !customerCart.canEdit ||
            catalogueState.status !== 'success'
        ) {
            return;
        }

        busyRef.current = true;
        setIsWorking(true);
        setLocalError('');
        setMessage('');

        try {
            const saved = localStorage.getItem(storageKey);
            let transfer: CartTransferRequest;

            if (saved !== null) {
                const parsed: unknown = JSON.parse(saved);

                if (!isTransfer(parsed)) {
                    throw new Error(
                        'The saved transfer could not be read. Your guest items have been kept.',
                    );
                }

                transfer = parsed;
            } else {
                if (guestCartItems.length === 0) {
                    return;
                }

                transfer = {
                    transferId: crypto.randomUUID(),
                    items: guestCartItems.map((item) => ({ ...item })),
                };

                // Save before sending so a refresh can retry the same request.
                localStorage.setItem(storageKey, JSON.stringify(transfer));
                setHasPendingTransfer(true);
            }

            const confirmed = await customerCart.transferItems(transfer);

            if (!confirmed) {
                return;
            }

            if (!clearTransferredGuestCart(transfer.items)) {
                setLocalError(
                    'The transfer succeeded, but the saved guest cart changed or could not be cleared. It has been kept. Retry to finish cleanup; the same transfer will not be added twice.',
                );
                return;
            }

            localStorage.removeItem(storageKey);
            setHasPendingTransfer(false);
            setMessage('Your guest items have been added to your account cart.');
        } catch (error) {
            setLocalError(
                error instanceof Error
                    ? error.message
                    : 'We couldn’t prepare the transfer. Your guest items have been kept.',
            );
        } finally {
            busyRef.current = false;
            setIsWorking(false);
        }
    }

    const hasItems = guestCartItems.length > 0;

    if (
        !hasItems &&
        !hasPendingTransfer &&
        !message &&
        !localError
    ) {
        return null;
    }

    const canTransfer =
        customerCart.canEdit &&
        catalogueState.status === 'success' &&
        !isWorking;

    const requiresReload =
        catalogueState.status === 'error' ||
        customerCart.needsReload ||
        customerCart.cartState.status === 'error';

    return (
        <section
            className="guest-cart-transfer"
            aria-labelledby="guest-transfer-title"
        >
            <h2 id="guest-transfer-title">Your guest cart</h2>

            {(hasItems || hasPendingTransfer) && (
                <>
                    <p>
                        Add the items saved on this browser to your account cart.
                        Existing account quantities will be combined with them.
                    </p>

                    <div className="cart-actions">
                        <button
                            className="primary-link"
                            type="button"
                            disabled={!canTransfer}
                            onClick={handleTransfer}
                        >
                            {isWorking
                                ? 'Transferring…'
                                : hasPendingTransfer
                                    ? 'Retry guest-cart transfer'
                                    : 'Add guest items to my cart'}
                        </button>

                        {requiresReload && (
                            <button
                                className="clear-search-button"
                                type="button"
                                disabled={isWorking || customerCart.isSaving}
                                onClick={retryCatalogue}
                            >
                                Reload cart
                            </button>
                        )}
                    </div>
                </>
            )}

            <p role="status" aria-atomic="true">
                {isWorking ? 'Transferring your guest items. Please wait.' : message}
            </p>

            <p className="field-error" role="alert" aria-atomic="true">
                {localError ||
                    customerCart.mutationError ||
                    (catalogueState.status === 'error'
                        ? catalogueState.message
                        : '')}
            </p>
        </section>
    );
}