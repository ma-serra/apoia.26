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

interface TreeNodeComponentProps {
  node: TreeNode;
  level: number;
  onNodeClick?: (node: TreeNode) => void;
  onCheckboxChange?: (nodeId: string | number, checked: boolean) => void;
  checkedNodes?: Set<string | number>;
  renderLabel?: (node: TreeNode) => React.ReactNode;
}

const TreeNodeComponent: React.FC<TreeNodeComponentProps> = ({ node, level, onNodeClick, onCheckboxChange, checkedNodes = new Set(), renderLabel }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasChildren = node.children ? node.children.length > 0 : false;
  const nextLevelIsLeaf = node.children ? node.children[0].children ? node.children[0].children.length === 0 : true : false;
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
    
    // Se tem filhos, marcar/desmarcar todos os filhos recursivamente
    if (hasChildren) {
      const allChildIds = getAllChildIds(node);
      // Se está marcando (pelo menos um filho não está marcado), marcar todos
      const shouldCheck = allChildIds.some(id => !checkedNodes.has(id));
      allChildIds.forEach(id => {
        onCheckboxChange?.(id, shouldCheck);
      });
    } else {
      // Se é folha, apenas toggle o próprio
      onCheckboxChange?.(node.id, !isChecked);
    }
  };

  // Função auxiliar para pegar todos os IDs dos filhos recursivamente
  const getAllChildIds = (node: TreeNode): (string | number)[] => {
    if (!node.children || node.children.length === 0) {
      return [node.id];
    }
    const ids: (string | number)[] = [];
    node.children.forEach(child => {
      ids.push(...getAllChildIds(child));
    });
    return ids;
  };

  // Verificar se todos os filhos estão marcados (para mostrar checkbox parcialmente marcado)
  const allChildrenChecked = hasChildren && node.children?.every(child => {
    if (child.children && child.children.length > 0) {
      return child.children.every(grandchild => checkedNodes.has(grandchild.id));
    }
    return checkedNodes.has(child.id);
  });

  const paddingLeft = level * 24;

  return (
    <div>
      <div
        style={{
          paddingLeft: `${paddingLeft}px`,
          display: 'flex',
          alignItems: 'center',
          padding: '4px 0 4px 0',
          cursor: 'pointer',
          userSelect: 'none',
        }}
        onClick={handleClick}
        className="tree-node"
      >
        {hasChildren && (
          <>
            <button
              onClick={handleToggle}
              className="btn btn-sm p-0"
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
            <input
              type="checkbox"
              checked={allChildrenChecked}
              onClick={handleCheckboxClick}
              style={{
                width: '12px',
                height: '12px',
                marginLeft: '4px',
                cursor: 'pointer',
              }}
            />
          </>
        )}
        {!hasChildren && (
          <input
            type="checkbox"
            checked={isChecked}
            // onChange={handleCheckboxClick}
            onClick={handleCheckboxClick}
            style={{
              width: '12px',
              height: '12px',
              paddingLeft: '18px',
              display: 'flex',
              marginLeft: '8px',
              alignItems: 'center',
              justifyContent: 'center',
              borderLeft: '1px solid gray',
              background: 'transparent',
              color: isChecked ? '#0d6efd' : 'inherit',
            }}
          />
        )}
        
        <span style={{ marginLeft: '4px', fontSize: '12px' }}>
          {renderLabel ? renderLabel(node) : node.label}
        </span>
      </div>

      {hasChildren && isExpanded && (
        <div style={{ borderLeft: !nextLevelIsLeaf ? 'none' : '1px solid #e0e0e0', marginLeft: `${level * 16 + 12}px` }}>
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
