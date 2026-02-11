"""
Complexity analysis service for code submissions.
Analyzes code structure to estimate time and space complexity.
"""

import ast
import re
from typing import Dict, List, Tuple, Optional


class ComplexityAnalyzer:
    """
    Analyzes Python code to estimate time and space complexity.
    """
    
    @staticmethod
    def analyze_code_complexity(code: str) -> Dict[str, str]:
        """
        Analyze Python code to estimate time and space complexity.
        
        Args:
            code: Python source code to analyze
            
        Returns:
            Dictionary containing estimated time and space complexity
        """
        try:
            tree = ast.parse(code)
            analyzer = _ComplexityVisitor()
            analyzer.visit(tree)
            
            return {
                "time_complexity": analyzer.estimate_time_complexity(),
                "space_complexity": analyzer.estimate_space_complexity()
            }
        except Exception:
            # If AST parsing fails, return unknown
            return {
                "time_complexity": "Unknown",
                "space_complexity": "Unknown"
            }


class _ComplexityVisitor(ast.NodeVisitor):
    """
    AST visitor to analyze complexity patterns in code.
    """
    
    def __init__(self):
        self.loop_nesting_levels = 0
        self.max_loop_nesting = 0
        self.recursion_detected = False
        self.data_structure_operations = []
        self.function_calls = []
        self.nested_functions = 0
        
    def visit_For(self, node):
        self.loop_nesting_levels += 1
        self.max_loop_nesting = max(self.max_loop_nesting, self.loop_nesting_levels)
        
        # Visit the body of the loop
        self.generic_visit(node)
        
        self.loop_nesting_levels -= 1
    
    def visit_While(self, node):
        self.loop_nesting_levels += 1
        self.max_loop_nesting = max(self.max_loop_nesting, self.loop_nesting_levels)
        
        # Visit the body of the loop
        self.generic_visit(node)
        
        self.loop_nesting_levels -= 1
    
    def visit_FunctionDef(self, node):
        # Check if this is a recursive call
        for item in ast.walk(node):
            if isinstance(item, ast.Call) and isinstance(item.func, ast.Name):
                if item.func.id == node.name:
                    self.recursion_detected = True
        
        # Visit the function body
        self.nested_functions += 1
        self.generic_visit(node)
        self.nested_functions -= 1
    
    def visit_Call(self, node):
        # Track function calls that might affect complexity
        if isinstance(node.func, ast.Name):
            func_name = node.func.id
            self.function_calls.append(func_name)
            
            # Detect common operations that affect complexity
            if func_name in ['append', 'extend', 'insert']:
                self.data_structure_operations.append('list_mutation')
            elif func_name in ['pop', 'remove']:
                self.data_structure_operations.append('list_search_or_remove')
            elif func_name in ['sort', 'sorted']:
                self.data_structure_operations.append('sorting_operation')
            elif func_name in ['set', 'dict', 'list']:
                self.data_structure_operations.append('collection_creation')
        
        # Continue visiting
        self.generic_visit(node)
    
    def visit_Subscript(self, node):
        # Check for indexing operations
        if hasattr(node.ctx, '_fields') and 'Load' in str(type(node.ctx)):
            # This is accessing an element, not assignment
            pass
        
        # Continue visiting
        self.generic_visit(node)
    
    def estimate_time_complexity(self) -> str:
        """
        Estimate time complexity based on AST analysis.
        """
        if self.recursion_detected:
            # Recursion makes it harder to determine complexity without more analysis
            if self.max_loop_nesting > 0:
                return f"O(2^n * {'n^' if self.max_loop_nesting > 1 else ''}{self.max_loop_nesting})"
            else:
                return "O(2^n)"
        
        if self.max_loop_nesting == 0:
            # No loops, likely O(1) unless there are complex operations
            if any(op in self.data_structure_operations for op in ['sorting_operation']):
                return "O(n log n)"
            elif any(op in self.data_structure_operations for op in ['list_search_or_remove']):
                return "O(n)"
            else:
                return "O(1)"
        elif self.max_loop_nesting == 1:
            # Single loop
            if any(op in self.data_structure_operations for op in ['sorting_operation']):
                return "O(n log n)"
            else:
                return "O(n)"
        elif self.max_loop_nesting == 2:
            # Nested loops
            return "O(n²)"
        elif self.max_loop_nesting == 3:
            # Triple nested loops
            return "O(n³)"
        else:
            # Very deeply nested
            return f"O(n^{self.max_loop_nesting})"
    
    def estimate_space_complexity(self) -> str:
        """
        Estimate space complexity based on AST analysis.
        """
        # Check for recursion which typically increases space complexity
        if self.recursion_detected:
            # Recursive algorithms often have O(n) or higher space complexity due to call stack
            if self.max_loop_nesting > 0:
                return f"O(n * {'n^' if self.max_loop_nesting > 1 else ''}{self.max_loop_nesting})"
            else:
                return "O(n)"
        
        # Check for data structure operations
        if any(op in self.data_structure_operations for op in ['collection_creation']):
            # Creating new collections often means O(n) space
            return "O(n)"
        
        # Check for nested functions which might create closures
        if self.nested_functions > 0:
            return "O(n)"
        
        # Default to constant space if no obvious space-intensive operations
        return "O(1)"


def analyze_complexity(code: str) -> Dict[str, str]:
    """
    Public function to analyze code complexity.
    
    Args:
        code: Source code to analyze
        
    Returns:
        Dictionary with time and space complexity estimates
    """
    analyzer = ComplexityAnalyzer()
    return analyzer.analyze_code_complexity(code)