import { MenuOutlined } from '@ant-design/icons';
import { Button, Drawer } from 'antd';
import { useState } from 'react';
import type { ReactNode } from 'react';

interface Props {
  sidebar: ReactNode;
  children: ReactNode;
}

export function AppShell({ sidebar, children }: Props) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="app-shell">
      {sidebar}
      <main className="app-main">
        <header className="app-mobile-header">
          <Button
            className="app-mobile-menu-button"
            type="text"
            icon={<MenuOutlined />}
            aria-label="打开菜单"
            onClick={() => setMobileSidebarOpen(true)}
          />
          <span className="app-mobile-brand">JLU GPA</span>
        </header>
        {children}
      </main>
      <Drawer
        className="app-sidebar-drawer"
        placement="left"
        width="min(300px, 85vw)"
        open={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
        closable={false}
        styles={{ body: { padding: 0 } }}
      >
        <div
          className="app-sidebar-drawer-content"
          onClickCapture={() => setMobileSidebarOpen(false)}
        >
          {sidebar}
        </div>
      </Drawer>
    </div>
  );
}
