import { useState } from 'react';

export default function Section({ title, children, defaultCollapsed = false, badge }) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <div className={`gui_box${collapsed ? ' collapsed' : ''}`}>
      <div className="gui_box_titlebar" onClick={() => setCollapsed(c => !c)}>
        <span className={`chevron${collapsed ? ' collapsed' : ''}`}>&#9662;</span>
        {title}
        {badge}
      </div>
      <div className="gui_box_body">{children}</div>
    </div>
  );
}
