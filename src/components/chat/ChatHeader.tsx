import React from 'react';
import { useMatrixClient } from '../../hooks/useMatrixClient';

export default function ChatHeader() {
  const { currentRoom } = useMatrixClient();

  return (
    <div className="p-3 border-b border-gray-200 bg-white">
      <div className="flex items-center gap-3">
        {currentRoom?.avatarUrl ? (
          <img
            src={currentRoom.avatarUrl}
            alt={currentRoom.name}
            className="w-8 h-8 rounded-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${currentRoom.name}`;
            }}
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
            <span className="text-sm font-medium text-indigo-600">
              {currentRoom?.name?.charAt(0)}
            </span>
          </div>
        )}
        <div>
          <h2 className="font-medium text-gray-900">
            {currentRoom?.name || '聊天室'}
          </h2>
          <p className="text-xs text-gray-500">
            {currentRoom?.memberCount ? `${currentRoom.memberCount} 位成员` : ''}
          </p>
        </div>
      </div>
    </div>
  );
}