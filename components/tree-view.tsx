'use client';

import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronRight, faChevronDown, faSquare, faCheckSquare } from '@fortawesome/free-solid-svg-icons';

export interface TreeNode {
  id: string | number;
  label: string;
  children?: TreeNode[];
  [key: string]: any;
}

interface TreeViewProps {
  data: TreeNode[];
  onNodeClick?: (node: TreeNode) => void;
  onCheckboxChange?: (nodeId: string | number, checked: boolean) => void;
  checkedNodes?: Set<string | number>;
  defaultExpanded?: boolean;
  className?: string;
  renderLabel?: (node: TreeNode) => React.ReactNode;
}

const TreeNodeComponent: React.FC<{
  node: TreeNode;
  level: number;
  onNodeClick?: (node: TreeNode) => void;
  onCheckboxChange?: (nodeId: string | number, checked: boolean) => void;
  checkedNodes?: Set<string | number>;
  renderLabel?: (node: TreeNode) => React.ReactNode;
}> = ({ node, level, onNodeClick, onCheckboxChange, checkedNodes = new Set(), renderLabel }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasChildren = node.children && node.children.length > 0;
  const isChecked = checkedNodes.has(node.id);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const handleClick = () => {
    onNodeClick?.(node);
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCheckboxChange?.(node.id, !isChecked);
  };

  const paddingLeft = level * 32;

  return (
    <div>
      <div
        style={{
          paddingLeft: `${paddingLeft}px`,
          display: 'flex',
          alignItems: 'center',
          padding: '8px 0 8px 0',
          cursor: 'pointer',
          userSelect: 'none',
        }}
        onClick={handleClick}
        className="tree-node"
      >
        {hasChildren && (
          <button
            onClick={handleToggle}
            className="btn btn-sm p-0 me-2"
            style={{
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              background: 'transparent',
            }}
          >
            {isExpanded ? (
              <FontAwesomeIcon icon={faChevronDown} size="sm" />
            ) : (
              <FontAwesomeIcon icon={faChevronRight} size="sm" />
            )}
          </button>
        )}
        {!hasChildren && (
          <button
            onClick={handleCheckboxClick}
            className="btn btn-sm p-0 me-2"
            style={{
              width: '24px',
              height: '24px',
              display: 'flex',
              marginLeft: '8px',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              background: 'transparent',
              color: isChecked ? '#0d6efd' : 'inherit',
            }}
          >
            <FontAwesomeIcon icon={isChecked ? faCheckSquare : faSquare} size="sm" />
          </button>
        )}
        
        <span className="tree-label">
          {renderLabel ? renderLabel(node) : node.label}
        </span>
      </div>

      {hasChildren && isExpanded && (
        <div style={{ borderLeft: '1px solid #e0e0e0', marginLeft: `${level * 16 + 12}px` }}>
          {node.children!.map((child) => (
            <TreeNodeComponent
              key={child.id}
              node={child}
              level={level + 1}
              onNodeClick={onNodeClick}
              onCheckboxChange={onCheckboxChange}
              checkedNodes={checkedNodes}
              renderLabel={renderLabel}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const TreeView: React.FC<TreeViewProps> = ({
  data,
  onNodeClick,
  onCheckboxChange,
  checkedNodes = new Set(),
  defaultExpanded = false,
  className = '',
  renderLabel,
}) => {
  if (!data || data.length === 0) {
    return (
      <div className={`tree-view ${className}`}>
        <p className="text-muted">Nenhum item para exibir</p>
      </div>
    );
  }

  return (
    <div className={`tree-view ${className}`}>
      {data.map((node) => (
        <TreeNodeComponent
          key={node.id}
          node={node}
          level={0}
          onNodeClick={onNodeClick}
          onCheckboxChange={onCheckboxChange}
          checkedNodes={checkedNodes}
          renderLabel={renderLabel}
        />
      ))}
    </div>
  );
};

export default TreeView;
