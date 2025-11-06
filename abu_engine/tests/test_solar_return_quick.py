"""
Quick validation test for Solar Return endpoint.
Tests structure and basic functionality without heavy calculations.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

def test_imports():
    """Test that all required modules can be imported."""
    print("=== Testing Imports ===")
    
    try:
        from abu_engine.core.chart import find_solar_return, solar_return_chart
        from abu_engine.main import app
        print("✓ All imports successful\n")
        return True
    except ImportError as e:
        print(f"✗ Import failed: {e}\n")
        return False


def test_endpoint_exists():
    """Test that the solar return endpoint is registered."""
    print("=== Testing Endpoint Registration ===")
    
    from abu_engine.main import app
    
    routes = [route.path for route in app.routes]
    
    if "/api/astro/solar-return" in routes:
        print("✓ Solar Return endpoint registered")
        print(f"  All routes: {[r for r in routes if '/api/' in r]}\n")
        return True
    else:
        print(f"✗ Solar Return endpoint not found in routes\n")
        return False


def test_function_signature():
    """Test that solar_return_chart has correct signature."""
    print("=== Testing Function Signature ===")
    
    from abu_engine.core.chart import solar_return_chart
    import inspect
    
    sig = inspect.signature(solar_return_chart)
    params = list(sig.parameters.keys())
    
    expected = ['birth_date', 'lat', 'lon', 'year']
    
    print(f"Function parameters: {params}")
    
    if all(p in params for p in expected):
        print("✓ Function signature correct\n")
        return True
    else:
        print(f"✗ Missing expected parameters. Expected: {expected}\n")
        return False


if __name__ == "__main__":
    print("Starting quick Solar Return validation...\n")
    
    results = []
    results.append(test_imports())
    results.append(test_endpoint_exists())
    results.append(test_function_signature())
    
    print("=" * 60)
    if all(results):
        print("✓ All quick validations passed!")
        print("  Solar Return endpoint is ready to use.")
    else:
        print("✗ Some validations failed")
        sys.exit(1)
    print("=" * 60)
