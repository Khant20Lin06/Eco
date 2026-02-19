'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import {
  getCart,
  getUnreadChatCount,
  getUnreadNotificationsCount,
  listWishlist
} from '../lib/api';
import { useAuthSession } from '../lib/hooks/use-auth-session';
import { getRealtimeSocket } from '../lib/realtime';
import { HEADER_COUNTS_REFRESH_EVENT } from '../lib/ui-events';

function IconUser() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path d="M20 21a8 8 0 0 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function IconHeart() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path d="m20.84 4.61-.01-.01a5.5 5.5 0 0 0-7.78 0L12 5.65l-1.05-1.04a5.5 5.5 0 0 0-7.78 7.78l1.05 1.04L12 21l7.78-7.57 1.05-1.04a5.5 5.5 0 0 0 .01-7.78z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function IconBag() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path d="M6 7h12l-1 13H7L6 7zm3 0V5a3 3 0 1 1 6 0v2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function IconBell() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="M15 18H5l1.5-1.5v-5a5.5 5.5 0 0 1 11 0v5L19 18h-4m0 0a3 3 0 1 1-6 0h6z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function IconMessage() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="M6 8h12M6 12h8m-8 8 3.8-3H18a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

type NavActionIconsProps = {
  accountHref: string;
  chatHref: string;
  notificationsHref: string;
  wishlistHref: string;
  bagHref: string;
  accountTitle: string;
};

type CartResponse = {
  items?: Array<{ qty?: number }>;
};

export default function NavActionIcons({
  accountHref,
  chatHref,
  notificationsHref,
  wishlistHref,
  bagHref,
  accountTitle
}: NavActionIconsProps) {
  const pathname = usePathname();
  const { accessToken } = useAuthSession();
  const [wishlistCount, setWishlistCount] = useState(0);
  const [cartCount, setCartCount] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);

  const refreshCounts = useCallback(async () => {
    if (!accessToken) {
      setWishlistCount(0);
      setCartCount(0);
      setNotificationCount(0);
      setChatUnreadCount(0);
      return;
    }

    try {
      const [wishlistRes, cartRes, unreadRes, unreadChatRes] = await Promise.all([
        listWishlist(accessToken),
        getCart<CartResponse>(accessToken),
        getUnreadNotificationsCount(accessToken),
        getUnreadChatCount(accessToken)
      ]);
      setWishlistCount(wishlistRes.items.length);
      setCartCount(
        cartRes.items?.reduce((sum, item) => sum + (item.qty ?? 0), 0) ?? 0
      );
      setNotificationCount(unreadRes.count ?? 0);
      setChatUnreadCount(unreadChatRes.count ?? 0);
    } catch {
      setWishlistCount(0);
      setCartCount(0);
      setNotificationCount(0);
      setChatUnreadCount(0);
    }
  }, [accessToken]);

  useEffect(() => {
    refreshCounts();
  }, [refreshCounts, pathname]);

  useEffect(() => {
    if (!accessToken) {
      return;
    }
    const socket = getRealtimeSocket(accessToken);

    const handleConnect = () => {
      void refreshCounts();
    };
    const handleNew = () => {
      void refreshCounts();
    };
    const handleRead = () => {
      void refreshCounts();
    };
    const handleReadAll = () => {
      void refreshCounts();
    };
    const handleChatMessage = () => {
      void refreshCounts();
    };
    const handleChatRead = () => {
      void refreshCounts();
    };

    socket.on('connect', handleConnect);
    socket.on('notifications:new', handleNew);
    socket.on('notifications:read', handleRead);
    socket.on('notifications:read-all', handleReadAll);
    socket.on('chat:message', handleChatMessage);
    socket.on('chat:read', handleChatRead);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('notifications:new', handleNew);
      socket.off('notifications:read', handleRead);
      socket.off('notifications:read-all', handleReadAll);
      socket.off('chat:message', handleChatMessage);
      socket.off('chat:read', handleChatRead);
    };
  }, [accessToken, refreshCounts]);

  useEffect(() => {
    const handler = () => {
      void refreshCounts();
    };
    window.addEventListener(HEADER_COUNTS_REFRESH_EVENT, handler);
    return () => {
      window.removeEventListener(HEADER_COUNTS_REFRESH_EVENT, handler);
    };
  }, [refreshCounts]);

  return (
    <div className="flex items-center gap-3">
      <Link aria-label={accountTitle} className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#111] transition hover:bg-[#f1f1f1]" href={accountHref} title={accountTitle}>
        <IconUser />
      </Link>
      <Link
        aria-label="Notifications"
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-[#111] transition hover:bg-[#f1f1f1]"
        href={notificationsHref}
        title="Notifications"
      >
        <span className="absolute right-0 top-0 inline-flex h-5 min-w-[18px] items-center justify-center rounded-full bg-[#e93a52] px-1 text-[10px] font-semibold text-white">
          {notificationCount}
        </span>
        <IconBell />
      </Link>
      <Link
        aria-label="Chat"
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-[#111] transition hover:bg-[#f1f1f1]"
        href={chatHref}
        title="Chat"
      >
        {chatUnreadCount > 0 ? (
          <span className="absolute right-0 top-0 inline-flex h-5 min-w-[18px] items-center justify-center rounded-full bg-[#e93a52] px-1 text-[10px] font-semibold text-white">
            {chatUnreadCount}
          </span>
        ) : null}
        <IconMessage />
      </Link>
      <Link aria-label="Wishlist" className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-[#111] transition hover:bg-[#f1f1f1]" href={wishlistHref} title="Wishlist">
        <span className="absolute right-0 top-0 inline-flex h-5 min-w-[18px] items-center justify-center rounded-full bg-[#e93a52] px-1 text-[10px] font-semibold text-white">
          {wishlistCount}
        </span>
        <IconHeart />
      </Link>
      <Link aria-label="Bag" className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-[#111] transition hover:bg-[#f1f1f1]" href={bagHref} title="Bag">
        <span className="absolute right-0 top-0 inline-flex h-5 min-w-[18px] items-center justify-center rounded-full bg-[#e93a52] px-1 text-[10px] font-semibold text-white">
          {cartCount}
        </span>
        <IconBag />
      </Link>
    </div>
  );
}
