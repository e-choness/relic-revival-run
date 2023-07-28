using System;
using System.Collections;
using System.Collections.Generic;
using Unity.VisualScripting;
using UnityEngine;
using UnityEngine.InputSystem;

public class PlayerController : MonoBehaviour
{
    
    [SerializeField] InputActionAsset playerInputActionAsset = null;
    [SerializeField] float jumpVelocity = 20.0f;

    
    private InputActionMap _playerInputActionMap = null;
    private InputAction _jumpInputAction = null;
    
    // private InputAction _interactInputAction = null;
    private Rigidbody2D _rigidBody = null;

    private bool _isGrounded = true;
    private void Awake()
    {
        _playerInputActionMap = playerInputActionAsset.FindActionMap("Player");
        _jumpInputAction = _playerInputActionMap.FindAction("Jump");
        
        // _interactInputAction = _playerInputActionMap.FindAction("Interact");
        _rigidBody = GetComponent<Rigidbody2D>();
    }

    private void OnEnable()
    {
        _jumpInputAction.Enable();
        
        // _interactInputAction.Enable();

        _jumpInputAction.performed += OnJumpPerformed;
        _jumpInputAction.canceled += OnJumpCancelled;

    }

    private void OnDisable()
    {
        _jumpInputAction.Disable();
        
        // _interactInputAction.Disable();
        
        _jumpInputAction.performed -= OnJumpPerformed;
        _jumpInputAction.canceled -= OnJumpCancelled;

    }

    private void OnJumpPerformed(InputAction.CallbackContext context)
    {
        
        if (_isGrounded)
        {
            _rigidBody.AddForce(Vector2.up * jumpVelocity);
#if UNITY_EDITOR
            Debug.Log($"Jump performed! {Vector2.up.ToString()} {jumpVelocity.ToString()}");
#endif
        }
            
    }

    private void OnJumpCancelled(InputAction.CallbackContext context)
    {
        _rigidBody.AddForce(Vector2.zero);
#if UNITY_EDITOR
        // Debug.Log($"Jump cancelled!");
#endif
    }
    private void OnCollisionEnter2D(Collision2D other)
    {
        if (other.gameObject.CompareTag("Ground"))
            _isGrounded = true;
    }

    private void OnCollisionExit2D(Collision2D other)
    {
        if(other.gameObject.CompareTag("Ground"))
            _isGrounded = false;
    }
    
    private void OnTriggerEnter2D(Collider2D other)
    {

        var toolBox = GetComponentInChildren<ToolSelector>();
        var toolBoxIndex = toolBox.GetToolIndex();
        if(other.gameObject.CompareTag("PickUp"))
        {
            var spawn = other.gameObject.GetComponent<spawnObjectScript>();
            var spawnIndex = spawn.spawnType;
#if UNITY_EDITOR
            Debug.Log($"toolBox: { toolBoxIndex.ToString()} spawn index: {spawnIndex.ToString()}");
#endif
            if(toolBoxIndex == spawnIndex)
                Destroy(other.gameObject);
        }
    }

}



